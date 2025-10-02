from typing import List, Optional, Dict, Any, AsyncIterator, Union, Tuple
from fastapi import FastAPI, HTTPException, Security, Depends, Request, Form
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager, nullcontext
from supabase import create_client, Client
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from dotenv import load_dotenv
from httpx import AsyncClient
from pathlib import Path
from mem0 import Memory
import asyncio
import base64
import time
import json
import sys
import os

# Import Langfuse configuration
from configure_langfuse import configure_langfuse

# Import database utility functions
from db_utils import (
    fetch_conversation_history,
    create_conversation,
    update_conversation_title,
    generate_session_id,
    generate_conversation_title,
    store_message,
    convert_history_to_pydantic_format,
    check_rate_limit,
    store_request
)

from pydantic_ai import Agent, BinaryContent
# Import all the message part classes from Pydantic AI
from pydantic_ai.messages import (
    ModelMessage, ModelRequest, ModelResponse, TextPart, ModelMessagesTypeAdapter,
    UserPromptPart, PartDeltaEvent, PartStartEvent, TextPartDelta
)

from agent import agent, AgentDeps, get_model
from clients import get_agent_clients, get_mem0_client_async

# Check if we're in production
is_production = os.getenv("ENVIRONMENT") == "production"

if not is_production:
    # Development: prioritize .env file
    project_root = Path(__file__).resolve().parent
    dotenv_path = project_root / '.env'
    load_dotenv(dotenv_path, override=True)
else:
    # Production: use cloud platform env vars only
    load_dotenv()

# Define clients as None initially
embedding_client = None
supabase = None
http_client = None
title_agent = None
mem0_client = None
tracer = None

# Define the lifespan context manager for the application
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for the FastAPI application.
    
    Handles initialization and cleanup of resources.
    """
    global embedding_client, supabase, http_client, title_agent, mem0_client, tracer

    # Initialize Langfuse tracer (returns None if not configured)
    tracer = configure_langfuse()    
    
    # Startup: Initialize all clients
    embedding_client, supabase = get_agent_clients()
    http_client = AsyncClient()
    title_agent = Agent(model=get_model())
    mem0_client = await get_mem0_client_async()
    
    yield  # This is where the app runs
    
    # Shutdown: Clean up resources
    if http_client:
        await http_client.aclose()

# Initialize FastAPI app
app = FastAPI(lifespan=lifespan)
security = HTTPBearer()        

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """
    Verify the JWT token from Supabase and return the user information.
    
    Args:
        credentials: The HTTP Authorization credentials containing the bearer token
        
    Returns:
        Dict[str, Any]: The user information from Supabase
        
    Raises:
        HTTPException: If the token is invalid or the user cannot be verified
    """
    try:
        # Get the token from the Authorization header
        token = credentials.credentials
        
        # Access the global HTTP client
        global http_client # noqa: F824
        if not http_client:
            raise HTTPException(status_code=500, detail="HTTP client not initialized")
        
        # Get the Supabase URL and anon key from environment variables
        # These should match the environment variable names used in your project
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        # Make request to Supabase auth API to get user info using the global HTTP client
        response = await http_client.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": supabase_key
            }
        )
        
        # Check if the request was successful
        if response.status_code != 200:
            print(f"Auth response error: {response.text}")
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Return the user information
        user_data = response.json()
        return user_data
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

# Request/Response Models
class FileAttachment(BaseModel):
    fileName: str
    content: str  # Base64 encoded content
    mimeType: str

class AgentRequest(BaseModel):
    query: str
    user_id: str
    request_id: str
    session_id: str
    files: Optional[List[FileAttachment]] = None


# Add this helper function to your backend code
async def stream_error_response(error_message: str, session_id: str):
    """
    Creates a streaming response for error messages.
    
    Args:
        error_message: The error message to display to the user
        session_id: The current session ID
        
    Yields:
        Encoded JSON chunks for the streaming response
    """
    # First yield the error message as text
    yield json.dumps({"text": error_message}).encode('utf-8') + b'\n'
    
    # Then yield a final chunk with complete flag
    final_data = {
        "text": error_message,
        "session_id": session_id,
        "error": error_message,
        "complete": True
    }
    yield json.dumps(final_data).encode('utf-8') + b'\n'

@app.post("/api/pydantic-agent")
async def pydantic_agent(request: AgentRequest, user: Dict[str, Any] = Depends(verify_token)):
    # Verify that the user ID in the request matches the user ID from the token
    if request.user_id != user.get("id"):
        return StreamingResponse(
            stream_error_response("User ID in request does not match authenticated user", request.session_id),
            media_type='text/plain'
        )
        
    try:
        # Check rate limit
        rate_limit_ok = await check_rate_limit(supabase, request.user_id)
        if not rate_limit_ok:
            return StreamingResponse(
                stream_error_response("Rate limit exceeded. Please try again later.", request.session_id),
                media_type='text/plain'
            )
        
        # Start request tracking in parallel
        request_tracking_task = asyncio.create_task(
            store_request(supabase, request.request_id, request.user_id, request.query)
        )
        
        session_id = request.session_id
        conversation_record = None
        conversation_title = None
        
        # Check if session_id is empty, create a new conversation if needed
        if not session_id:
            session_id = generate_session_id(request.user_id)
            # Create a new conversation record
            conversation_record = await create_conversation(supabase, request.user_id, session_id)
        
        # Store user's query immediately with any file attachments
        file_attachments = None
        if request.files:
            # Convert Pydantic models to dictionaries for storage
            file_attachments = [{
                "fileName": file.fileName,
                "content": file.content,
                "mimeType": file.mimeType
            } for file in request.files]
            
        await store_message(
            supabase=supabase,
            session_id=session_id,
            message_type="human",
            content=request.query,
            files=file_attachments
        )
        
        # Fetch conversation history from the DB
        conversation_history = await fetch_conversation_history(supabase, session_id)
        
        # Convert conversation history to Pydantic AI format
        pydantic_messages = await convert_history_to_pydantic_format(conversation_history)
        
        # Retrieve relevant memories with Mem0
        relevant_memories = {"results": []}
        try:
            relevant_memories = await mem0_client.search(query=request.query, user_id=request.user_id, limit=3)
        except:
            # Slight hack - retry again with a new connection pool
            time.sleep(1)
            relevant_memories = await mem0_client.search(query=request.query, user_id=request.user_id, limit=3)

        memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])
        
        # Create memory task to run in parallel
        memory_messages = [{"role": "user", "content": request.query}]
        memory_task = asyncio.create_task(mem0_client.add(memory_messages, user_id=request.user_id))
        
        # Start title generation in parallel if this is a new conversation
        title_task = None
        if conversation_record:
            title_task = asyncio.create_task(generate_conversation_title(title_agent, request.query))
        
        async def stream_response():
            # Process title result if it exists (in the background)
            nonlocal conversation_title

            # Use the global HTTP client
            agent_deps = AgentDeps(
                embedding_client=embedding_client, 
                supabase=supabase, 
                http_client=http_client,
                brave_api_key=os.getenv("BRAVE_API_KEY", ""),
                searxng_base_url=os.getenv("SEARXNG_BASE_URL", ""),
                memories=memories_str
            )
            
            # Process any file attachments for the agent
            binary_contents = []
            if request.files:
                for file in request.files:
                    try:
                        # Decode the base64 content
                        binary_data = base64.b64decode(file.content)
                        # Create a BinaryContent object
                        fileMimeType = "application/pdf" if file.mimeType == "text/plain" else file.mimeType
                        binary_content = BinaryContent(
                            data=binary_data,
                            media_type=fileMimeType
                        )
                        binary_contents.append(binary_content)
                    except Exception as e:
                        print(f"Error processing file {file.fileName}: {str(e)}")
            
            # Create input for the agent with the query and any binary contents
            agent_input = [request.query]
            if binary_contents:
                agent_input.extend(binary_contents)
            
            full_response = ""
            
            # Use tracer context if available, otherwise use nullcontext
            span_context = tracer.start_as_current_span("Pydantic-Ai-Trace") if tracer else nullcontext()
            
            with span_context as span:
                if tracer and span:
                    # Set user and session attributes for Langfuse
                    span.set_attribute("langfuse.user.id", request.user_id)
                    span.set_attribute("langfuse.session.id", session_id)
                    span.set_attribute("input.value", request.query)
                
                # Run the agent with the user prompt, binary contents, and the chat history
                async with agent.iter(agent_input, deps=agent_deps, message_history=pydantic_messages) as run:
                    async for node in run:
                        if Agent.is_model_request_node(node):
                            # A model request node => We can stream tokens from the model's request
                            async with node.stream(run.ctx) as request_stream:
                                async for event in request_stream:
                                    if isinstance(event, PartStartEvent) and event.part.part_kind == 'text':
                                        yield json.dumps({"text": event.part.content}).encode('utf-8') + b'\n'
                                        full_response += event.part.content
                                    elif isinstance(event, PartDeltaEvent) and isinstance(event.delta, TextPartDelta):
                                        delta = event.delta.content_delta
                                        yield json.dumps({"text": full_response}).encode('utf-8') + b'\n'
                                        full_response += delta
                
                # Set the output value after completion if tracing
                if tracer and span:
                    span.set_attribute("output.value", full_response)
                    
            # After streaming is complete, store the full response in the database
            message_data = run.result.new_messages_json()
            
            # Store agent's response
            await store_message(
                supabase=supabase,
                session_id=session_id,
                message_type="ai",
                content=full_response,
                message_data=message_data,
                data={"request_id": request.request_id}
            )
            
            # Wait for title generation to complete if it's running
            if title_task:
                try:
                    title_result = await title_task
                    conversation_title = title_result
                    # Update the conversation title in the database
                    await update_conversation_title(supabase, session_id, conversation_title)
                    
                    # Send the final title in the last chunk
                    final_data = {
                        "text": full_response,
                        "session_id": session_id,
                        "conversation_title": conversation_title,
                        "complete": True
                    }
                    yield json.dumps(final_data).encode('utf-8') + b'\n'
                except Exception as e:
                    print(f"Error processing title: {str(e)}")
            else:
                yield json.dumps({"text": full_response, "complete": True}).encode('utf-8') + b'\n'

            # Wait for the memory task to complete if needed
            try:
                await memory_task
            except Exception as e:
                print(f"Error updating memories: {str(e)}")
                
            # Wait for request tracking task to complete
            try:
                await request_tracking_task
            except Exception as e:
                print(f"Error tracking request: {str(e)}")
            except asyncio.CancelledError:
                # This is expected if the task was cancelled
                pass
        
        return StreamingResponse(stream_response(), media_type='text/plain')

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        # Store error message in conversation if session_id exists
        if request.session_id:
            await store_message(
                supabase=supabase,
                session_id=request.session_id,
                message_type="ai",
                content="I apologize, but I encountered an error processing your request.",
                data={"error": str(e), "request_id": request.request_id}
            )
        # Return a streaming response with the error
        return StreamingResponse(
            stream_error_response(f"Error: {str(e)}", request.session_id),
            media_type='text/plain'
        )


# ==============================================================================
# SYNC MONITORING ENDPOINTS
# ==============================================================================

class SyncStatisticsResponse(BaseModel):
    total_contacts: int
    total_orders: int
    total_tags: int
    total_subscriptions: int
    last_sync_time: Optional[str]
    pending_conflicts: int
    total_sync_operations: int
    successful_syncs: int
    failed_syncs: int

class SyncHealthMetricsResponse(BaseModel):
    total_entities: int
    successful_syncs: int
    failed_syncs: int
    pending_conflicts: int
    health_score: float
    last_updated: str

class SyncActivityResponse(BaseModel):
    entity_type: str
    entity_id: str
    keap_id: str
    last_synced_at: str
    sync_direction: str
    conflict_status: str
    last_error: Optional[str] = None

class SyncConflictResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    keap_data: Dict[str, Any]
    supabase_data: Dict[str, Any]
    conflict_fields: List[str]
    resolution_strategy: str
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: str
    updated_at: str

class ManualSyncRequest(BaseModel):
    keap_account_id: str
    sync_type: Optional[str] = "all"  # 'contacts', 'orders', 'tags', 'subscriptions', 'all'

@app.get("/api/sync/statistics", response_model=SyncStatisticsResponse)
async def get_sync_statistics(user: Dict[str, Any] = Depends(verify_token)):
    """
    Get sync statistics for dashboard.
    
    Returns:
        SyncStatisticsResponse: Comprehensive sync statistics
    """
    try:
        # Call the database function for sync statistics
        response = supabase.rpc('get_sync_statistics').execute()
        
        if response.data:
            stats = response.data
            return SyncStatisticsResponse(
                total_contacts=stats.get('total_contacts', 0),
                total_orders=stats.get('total_orders', 0),
                total_tags=stats.get('total_tags', 0),
                total_subscriptions=stats.get('total_subscriptions', 0),
                last_sync_time=stats.get('last_sync_time'),
                pending_conflicts=stats.get('pending_conflicts', 0),
                total_sync_operations=stats.get('total_sync_operations', 0),
                successful_syncs=stats.get('successful_syncs', 0),
                failed_syncs=stats.get('failed_syncs', 0)
            )
        else:
            # Return default empty statistics if no data
            return SyncStatisticsResponse(
                total_contacts=0,
                total_orders=0,
                total_tags=0,
                total_subscriptions=0,
                last_sync_time=None,
                pending_conflicts=0,
                total_sync_operations=0,
                successful_syncs=0,
                failed_syncs=0
            )
    except Exception as e:
        print(f"Error getting sync statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sync statistics: {str(e)}")

@app.get("/api/sync/health", response_model=SyncHealthMetricsResponse)
async def get_sync_health_metrics(user: Dict[str, Any] = Depends(verify_token)):
    """
    Get sync health metrics for monitoring.
    
    Returns:
        SyncHealthMetricsResponse: Health metrics and reliability data
    """
    try:
        response = supabase.rpc('get_sync_health_metrics').execute()
        
        if response.data:
            health = response.data
            return SyncHealthMetricsResponse(
                total_entities=health.get('total_entities', 0),
                successful_syncs=health.get('successful_syncs', 0),
                failed_syncs=health.get('failed_syncs', 0),
                pending_conflicts=health.get('pending_conflicts', 0),
                health_score=health.get('health_score', 100.0),
                last_updated=health.get('last_updated', datetime.now(timezone.utc).isoformat())
            )
        else:
            return SyncHealthMetricsResponse(
                total_entities=0,
                successful_syncs=0,
                failed_syncs=0,
                pending_conflicts=0,
                health_score=100.0,
                last_updated=datetime.now(timezone.utc).isoformat()
            )
    except Exception as e:
        print(f"Error getting sync health metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sync health metrics: {str(e)}")

@app.get("/api/sync/activities", response_model=List[SyncActivityResponse])
async def get_recent_sync_activities(
    limit: int = 20,
    user: Dict[str, Any] = Depends(verify_token)
):
    """
    Get recent sync activities for dashboard.
    
    Args:
        limit: Number of activities to return (default: 20)
        
    Returns:
        List[SyncActivityResponse]: Recent sync activities
    """
    try:
        response = supabase.rpc('get_recent_sync_activities', {'limit_param': limit}).execute()
        
        if response.data:
            return [
                SyncActivityResponse(
                    entity_type=activity['entity_type'],
                    entity_id=activity['entity_id'],
                    keap_id=activity['keap_id'],
                    last_synced_at=activity['last_synced_at'],
                    sync_direction=activity['sync_direction'],
                    conflict_status=activity['conflict_status'],
                    last_error=activity.get('last_error')
                )
                for activity in response.data
            ]
        else:
            return []
    except Exception as e:
        print(f"Error getting sync activities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sync activities: {str(e)}")

@app.get("/api/sync/conflicts", response_model=List[SyncConflictResponse])
async def get_pending_sync_conflicts(user: Dict[str, Any] = Depends(verify_token)):
    """
    Get pending sync conflicts that need resolution.
    
    Returns:
        List[SyncConflictResponse]: Pending sync conflicts
    """
    try:
        response = supabase.table('sync_conflicts') \
            .select('*') \
            .is_('resolved_at', 'null') \
            .order('created_at', desc=True) \
            .execute()
        
        if response.data:
            return [
                SyncConflictResponse(
                    id=conflict['id'],
                    entity_type=conflict['entity_type'],
                    entity_id=conflict['entity_id'],
                    keap_data=conflict['keap_data'],
                    supabase_data=conflict['supabase_data'],
                    conflict_fields=conflict['conflict_fields'],
                    resolution_strategy=conflict['resolution_strategy'],
                    resolved_at=conflict.get('resolved_at'),
                    resolved_by=conflict.get('resolved_by'),
                    resolution_notes=conflict.get('resolution_notes'),
                    created_at=conflict['created_at'],
                    updated_at=conflict['updated_at']
                )
                for conflict in response.data
            ]
        else:
            return []
    except Exception as e:
        print(f"Error getting sync conflicts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sync conflicts: {str(e)}")

@app.post("/api/sync/conflicts/{conflict_id}/resolve")
async def resolve_sync_conflict(
    conflict_id: str,
    resolution_strategy: str = Form(...),
    resolution_notes: Optional[str] = Form(None),
    user: Dict[str, Any] = Depends(verify_token)
):
    """
    Resolve a sync conflict.
    
    Args:
        conflict_id: UUID of the conflict to resolve
        resolution_strategy: Strategy for resolution ('keap_wins', 'supabase_wins', 'manual')
        resolution_notes: Optional notes about the resolution
        user: Authenticated user information
    """
    try:
        # Call the database function to resolve the conflict
        response = supabase.rpc('resolve_sync_conflict', {
            'conflict_id_param': conflict_id,
            'resolution_strategy_param': resolution_strategy,
            'resolved_by_param': user['id'],
            'resolution_notes_param': resolution_notes
        }).execute()
        
        if response.data:
            return {"success": True, "message": "Conflict resolved successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to resolve conflict")
            
    except Exception as e:
        print(f"Error resolving sync conflict: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve conflict: {str(e)}")

@app.post("/api/sync/trigger")
async def trigger_manual_sync(
    request: ManualSyncRequest,
    user: Dict[str, Any] = Depends(verify_token)
):
    """
    Trigger a manual sync operation.
    
    Args:
        request: Manual sync request parameters
        user: Authenticated user information
        
    Returns:
        Dict with sync trigger confirmation
    """
    try:
        # This endpoint would typically communicate with the sync worker
        # For now, we'll just log the request and return success
        print(f"Manual sync triggered by user {user['id']}: {request.dict()}")
        
        # In a real implementation, this would:
        # 1. Validate the Keap account ID
        # 2. Send a message to the sync worker or coordinator
        # 3. Track the sync request in the database
        
        # Store the sync trigger request
        trigger_data = {
            "keap_account_id": request.keap_account_id,
            "sync_type": request.sync_type,
            "triggered_by": user['id'],
            "triggered_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending"
        }
        
        # You would store this in a sync_requests table or send to sync worker
        print(f"Sync trigger stored: {trigger_data}")
        
        return {
            "success": True,
            "message": f"Manual sync triggered for {request.sync_type}",
            "keap_account_id": request.keap_account_id,
            "sync_type": request.sync_type
        }
        
    except Exception as e:
        print(f"Error triggering manual sync: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger manual sync: {str(e)}")

@app.get("/api/sync/status/{entity_type}")
async def get_sync_status_by_type(
    entity_type: str,
    user: Dict[str, Any] = Depends(verify_token)
):
    """
    Get sync status for a specific entity type.
    
    Args:
        entity_type: Type of entity ('contact', 'order', 'tag', 'subscription')
        user: Authenticated user information
        
    Returns:
        Dict with sync status data
    """
    try:
        # Validate entity type
        valid_types = ['contact', 'order', 'tag', 'subscription']
        if entity_type not in valid_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid entity type. Must be one of: {', '.join(valid_types)}"
            )
        
        response = supabase.rpc('get_sync_status_by_type', {
            'entity_type_param': entity_type
        }).execute()
        
        return {
            "entity_type": entity_type,
            "sync_status": response.data if response.data else []
        }
        
    except Exception as e:
        print(f"Error getting sync status by type: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sync status: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint for container orchestration and monitoring.
    
    Returns:
        Dict with status and service health information
    """
    # Check if critical dependencies are initialized
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "embedding_client": embedding_client is not None,
            "supabase": supabase is not None,
            "http_client": http_client is not None,
            "title_agent": title_agent is not None,
            "mem0_client": mem0_client is not None
        }
    }
    
    # If any critical service is not initialized, mark as unhealthy
    if not all(health_status["services"].values()):
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status


if __name__ == "__main__":
    import uvicorn
    # Feel free to change the port here if you need
    uvicorn.run(app, host="0.0.0.0", port=8001)
