name: "Keap-Supabase Bidirectional Sync System"
description: |

## Purpose
Implement a production-ready, bidirectional synchronization system between Keap CRM and Supabase that enables advanced analytics, AI agent capabilities, and real-time business insights through a secure Next.js dashboard.

## Core Principles
1. **Data Integrity First**: Implement conflict resolution and audit trails
2. **Real-time Sync**: Use webhooks where possible, intelligent polling where necessary
3. **Security**: All API keys and tokens secured in environment variables
4. **Scalability**: Rate limiting, batch operations, and queue management
5. **Observability**: Comprehensive logging and monitoring

---

## Goal
Create a two-way sync between Supabase and Keap CRM that synchronizes contacts, orders, tags, and subscriptions, with a Next.js dashboard for visualization and AI agent integration for advanced analytics. The system will leverage Cloudflare Workers for optimized edge computing with KV storage, Durable Objects for state management, and Hyperdrive for database acceleration.

## Why
- **Business Intelligence**: Unlock advanced analytics and AI capabilities by consolidating Keap data into a flexible Supabase data lake
- **Real-time Insights**: Enable live dashboards for customer lifetime value analysis, churn prediction, and segmentation
- **Automation**: Trigger-based workflows and AI-powered campaign suggestions
- **Decision Making**: Interactive reporting for better business decisions
- **AI Integration**: Natural language dashboards and predictive analytics

## What
A complete bidirectional synchronization system with:
- **Sync Engine**: Handles data flow between Keap and Supabase with conflict resolution
- **Database Schema**: Optimized tables for contacts, orders, tags, subscriptions with audit trails
- **Dashboard UI**: Next.js application with charts, filters, and real-time updates
- **AI Agent Integration**: RAG chat for natural language data queries
- **Admin Interface**: Sync monitoring, conflict resolution, and system health

### Success Criteria
- [ ] All Keap contacts, orders, tags, and subscriptions sync bidirectionally
- [ ] Conflicts are resolved automatically with manual override options
- [ ] Dashboard displays real-time KPIs and interactive charts
- [ ] AI agent answers natural language queries about business data
- [ ] System handles rate limits and recovers from API failures gracefully
- [ ] All sensitive data is properly secured and encrypted

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://developer.infusionsoft.com/docs/restv2/
  why: Core Keap API endpoints, authentication, and data models
  
- url: https://developer.infusionsoft.com/authentication/
  why: CRITICAL - OAuth2 flow, token management, refresh patterns
  
- url: https://developer.infusionsoft.com/tutorials/making-oauth-requests-without-user-authorization/
  why: CRITICAL - Server-to-server authentication for automated sync
  
- url: https://developer.infusionsoft.com/pat-and-sak/
  why: Personal Access Tokens vs Service Account Keys comparison
  
- url: https://github.com/infusionsoft/keap-sdk/tree/main/sdks/v2/typescript
  why: Official TypeScript SDK installation and usage patterns
  
- url: https://developers.cloudflare.com/workers/platform/storage-options/
  why: CRITICAL - Choosing between KV, Durable Objects, D1, Hyperdrive
  
- url: https://developers.cloudflare.com/durable-objects/
  why: Durable Objects for stateful sync coordination and conflict resolution
  
- url: https://developers.cloudflare.com/kv/
  why: Workers KV for caching OAuth tokens and sync metadata
  
- url: https://developers.cloudflare.com/workers/databases/connecting-to-databases/
  why: Hyperdrive for optimized Supabase connections
  
- url: https://supabase.com/docs/guides/database/functions
  why: Database functions for triggers and stored procedures
  
- url: https://supabase.com/docs/guides/realtime
  why: Real-time subscriptions for live dashboard updates
  
- file: backend_agent_api/db_utils.py
  why: Existing database patterns and error handling
  
- file: frontend/src/lib/supabase.ts
  why: Current Supabase client configuration
  
- file: sql/0-all-tables.sql
  why: Existing database schema patterns and RLS policies
  
- url: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
  why: Server actions for secure data mutations
  
- url: https://recharts.org/en-US/examples
  why: Chart components for dashboard visualization
```

### Current Codebase tree
```bash
ns_Agent_Deployment/
├── backend_agent_api/          # FastAPI agent with Supabase integration
│   ├── agent_api.py           # Main API endpoints
│   ├── db_utils.py            # Database utility functions
│   └── requirements.txt       # Python dependencies
├── frontend/                  # CURRENT: Vite React application (TO BE REPLACED)
│   ├── src/
│   │   ├── lib/supabase.ts   # Supabase client config (MIGRATE TO NEXT.JS)
│   │   ├── components/       # React components (MIGRATE TO NEXT.JS)
│   │   └── pages/           # Vite pages (REPLACE WITH NEXT.JS APP ROUTER)
│   ├── vite.config.ts        # Vite configuration (REMOVE)
│   └── package.json         # Frontend dependencies (UPDATE FOR NEXT.JS)
├── sql/                     # Database schema files
│   ├── 0-all-tables.sql    # Complete schema setup
│   └── *.sql               # Individual table schemas
└── docker-compose.yml      # Multi-service deployment
```

### Desired Codebase tree with files to be added
```bash
ns_Agent_Deployment/
├── cloudflare_workers/         # NEW: Edge computing sync service
│   ├── sync-coordinator/       # Durable Object for sync state management
│   │   ├── src/
│   │   │   ├── sync-coordinator.ts    # Main Durable Object class
│   │   │   ├── keap-oauth.ts         # OAuth2 token management
│   │   │   ├── conflict-resolver.ts   # Conflict resolution logic
│   │   │   └── sync-queue.ts         # Queue management
│   │   ├── wrangler.toml      # Cloudflare Workers configuration
│   │   └── package.json       # Dependencies
│   ├── webhook-handler/        # Worker for handling Keap webhooks
│   │   ├── src/
│   │   │   ├── index.ts       # Webhook endpoint
│   │   │   ├── hmac-verify.ts # Webhook signature verification
│   │   │   └── types.ts       # TypeScript interfaces
│   │   └── wrangler.toml      # Worker configuration
│   └── sync-worker/           # Scheduled sync worker
│       ├── src/
│       │   ├── index.ts       # Main sync logic
│       │   ├── keap-client.ts # Enhanced Keap API client
│       │   └── supabase-client.ts # Hyperdrive-optimized client
│       └── wrangler.toml      # Worker configuration
├── backend_sync_service/       # ENHANCED: Python service for complex operations
│   ├── sync_engine.py         # Orchestrates with Cloudflare Workers
│   ├── keap_client.py         # Keap API wrapper with OAuth2
│   ├── sync_models.py         # Data models for sync operations
│   ├── oauth_manager.py       # NEW: OAuth2 token lifecycle management
│   ├── webhook_handlers.py    # Backup webhook handlers
│   ├── sync_scheduler.py      # Scheduled sync jobs
│   └── requirements.txt       # Sync service dependencies
├── sql/
│   ├── 10-sync-tables.sql     # NEW: Sync tables and indexes
│   └── 11-sync-functions.sql  # NEW: Database functions for sync
├── frontend_nextjs/           # NEW: Next.js application (REPLACES frontend/)
│   ├── app/                   # Next.js App Router
│   │   ├── dashboard/         # Dashboard pages
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   └── layout.tsx     # Dashboard layout
│   │   ├── sync-admin/        # Sync administration
│   │   │   └── page.tsx       # Admin interface
│   │   ├── api/               # Next.js API routes
│   │   │   ├── dashboard/     # Dashboard API endpoints
│   │   │   └── sync/          # Sync API endpoints
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── dashboard/         # Dashboard components
│   │   │   ├── SyncStatus.tsx # Sync monitoring
│   │   │   ├── KpiCharts.tsx  # Business metrics
│   │   │   └── DataTable.tsx  # Tabular data display
│   │   ├── sync/             # Sync management UI
│   │   │   ├── ConflictResolver.tsx
│   │   │   └── SyncSettings.tsx
│   │   └── ui/               # Reusable UI components (shadcn/ui)
│   ├── lib/
│   │   ├── supabase.ts       # MIGRATED: Supabase client config
│   │   ├── keap-sync.ts      # NEW: Sync API client
│   │   ├── dashboard-queries.ts # NEW: Data queries
│   │   └── utils.ts          # Utility functions
│   ├── next.config.js        # Next.js configuration
│   ├── tailwind.config.ts    # Tailwind CSS config
│   └── package.json          # Next.js dependencies
```

### Known Gotchas of our codebase & Library Quirks
```python
# CRITICAL: Keap API has rate limits of 1500 calls per minute
# Must implement exponential backoff and request queuing

# CRITICAL: Supabase RLS policies must allow sync service user
# Create service role key for backend sync operations

# GOTCHA: Keap webhook verification requires HMAC signature validation
# Store webhook secret securely in environment variables  

# GOTCHA: FastAPI requires async/await for all database operations
# Don't mix sync/async code - use asyncio consistently

# GOTCHA: Supabase real-time only works with specific table configurations
# Enable realtime on sync tables: ALTER TABLE sync_contacts REPLICA IDENTITY FULL

# CRITICAL: Keap API returns different data structures for different endpoints
# Use TypeScript interfaces to ensure type safety across all operations

# GOTCHA: Next.js App Router requires different patterns than Pages Router
# Use Server Components for data fetching, Client Components for interactivity

# CRITICAL: Migration from Vite to Next.js requires updating imports
# Change from import.meta.env to process.env for environment variables

# GOTCHA: Next.js API routes run on server, handle CORS differently than Vite
# Use Next.js middleware for authentication instead of client-side routing guards

# CRITICAL: Keap OAuth2 flow requires HTTPS redirect URLs in production
# Authorization URL: https://accounts.infusionsoft.com/app/oauth/authorize
# Token endpoint: https://api.infusionsoft.com/token
# Scope MUST be "full" - only supported scope currently

# CRITICAL: Keap refresh tokens expire after 45 days if unused
# Implement automatic refresh every 21 hours to prevent token expiry
# New refresh tokens are issued with each refresh - MUST update stored token

# GOTCHA: Keap OAuth requires client_secret in Authorization header for refresh
# Format: Authorization: Basic base64(client_id:client_secret)

# CRITICAL: Cloudflare KV has eventual consistency - not suitable for OAuth token storage
# Use Durable Objects for OAuth token management to ensure consistency
# KV is best for caching sync metadata and configuration

# GOTCHA: Cloudflare Workers have 10ms CPU time limit on free tier
# Use Hyperdrive for database connections to reduce latency
# Batch operations and use background tasks for heavy processing

# CRITICAL: Durable Objects provide strong consistency within single object
# Perfect for managing OAuth tokens and sync state per Keap account
# Each Keap account should have its own Durable Object instance
```

## Implementation Blueprint

### Data models and structure

Core data models ensuring type safety and consistency:
```python
# Sync Models (backend_sync_service/sync_models.py)
from pydantic import BaseModel, UUID4
from typing import Optional, Dict, Any
from datetime import datetime

class SyncStatus(BaseModel):
    entity_type: str  # "contact", "order", "tag", "subscription"
    entity_id: UUID4
    keap_id: Optional[str] = None
    supabase_id: UUID4
    last_synced_at: datetime
    sync_direction: str  # "keap_to_supabase", "supabase_to_keap", "bidirectional"
    conflict_status: str = "none"  # "none", "pending", "resolved"
    
class KeapContact(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str] 
    tags: List[str]
    custom_fields: Dict[str, Any]
    
class SyncConflict(BaseModel):
    id: UUID4
    entity_type: str
    entity_id: UUID4
    keap_data: Dict[str, Any]
    supabase_data: Dict[str, Any]
    conflict_fields: List[str]
    resolution_strategy: str  # "keap_wins", "supabase_wins", "manual"
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1: Cloudflare Workers Foundation
CREATE cloudflare_workers/:
  - SETUP Wrangler CLI and authenticate with Cloudflare
  - CREATE Durable Object for OAuth token management
  - CONFIGURE KV namespace for sync metadata caching
  - SETUP Hyperdrive binding for optimized Supabase connections
  - IMPLEMENT comprehensive OAuth2 flow with token refresh

Task 2: Keap OAuth2 Integration  
CREATE cloudflare_workers/sync-coordinator/src/keap-oauth.ts:
  - IMPLEMENT complete OAuth2 authorization flow
  - CREATE automatic token refresh mechanism (every 21 hours)
  - HANDLE refresh token rotation and storage
  - ADD comprehensive error handling for token failures
  - MIRROR patterns from Keap OAuth documentation

Task 3: Next.js Migration Setup
CREATE frontend_nextjs/:
  - INITIALIZE new Next.js project with App Router
  - MIGRATE existing components from frontend/src/components/
  - SETUP Tailwind CSS and shadcn/ui components
  - CONFIGURE Supabase client for Next.js environment
  - PRESERVE existing authentication patterns from frontend/

Task 4: Database Schema Setup
CREATE sql/10-sync-tables.sql:
  - MIRROR pattern from: sql/1-user_profiles_requests.sql
  - CREATE tables: sync_contacts, sync_orders, sync_tags, sync_subscriptions
  - ADD audit fields: created_at, updated_at, last_synced_at
  - CREATE sync_status table for tracking sync state
  - CREATE sync_conflicts table for conflict resolution

Task 5: Webhook Handler Worker
CREATE cloudflare_workers/webhook-handler/:
  - CREATE Worker to handle Keap webhooks with HMAC verification
  - IMPLEMENT webhook signature validation using crypto.subtle
  - TRIGGER Durable Object sync coordination
  - ADD comprehensive webhook event processing
  - ENSURE idempotent webhook processing

Task 6: Sync Worker Implementation
CREATE cloudflare_workers/sync-worker/:
  - IMPLEMENT scheduled sync worker with cron triggers
  - CREATE Hyperdrive-optimized Supabase client
  - ADD rate-limited Keap API client
  - IMPLEMENT batch processing for large datasets
  - COORDINATE with Durable Objects for state management

Task 7: Database Functions
CREATE sql/11-sync-functions.sql:
  - CREATE stored procedures for sync operations
  - IMPLEMENT conflict resolution functions
  - ADD triggers for bidirectional sync
  - CREATE RLS policies for sync service access
  - ENABLE realtime on sync tables

Task 7: Dashboard Backend API
MODIFY backend_agent_api/agent_api.py:
  - ADD endpoints for dashboard data queries
  - IMPLEMENT KPI calculation functions
  - ADD sync status monitoring endpoints
  - PRESERVE existing API patterns and authentication

Task 8: Next.js Dashboard Components
CREATE frontend_nextjs/components/dashboard/:
  - CREATE SyncStatus.tsx for sync monitoring
  - CREATE KpiCharts.tsx using Recharts
  - IMPLEMENT real-time updates with Supabase subscriptions
  - USE Next.js App Router patterns and Server Components

Task 9: Next.js Admin Interface
CREATE frontend_nextjs/components/sync/:
  - CREATE ConflictResolver.tsx for manual conflict resolution
  - CREATE SyncSettings.tsx for sync configuration
  - ADD data tables with filtering and search
  - IMPLEMENT sync controls (pause, resume, manual sync)

Task 10: Next.js Dashboard Pages
CREATE frontend_nextjs/app/dashboard/:
  - CREATE page.tsx and layout.tsx for dashboard
  - INTEGRATE all dashboard components
  - ADD responsive layout and navigation
  - IMPLEMENT data loading with error boundaries
  - ADD export functionality for reports

Task 11: Service Integration
UPDATE docker-compose.yml:
  - ADD sync service configuration
  - CONFIGURE service networking
  - ADD environment variables for all services
  - ENSURE proper startup dependencies
```

### Per task pseudocode

```typescript
// Task 1: Cloudflare Workers Foundation Pseudocode
// Initialize Wrangler and create Durable Object
npx wrangler init sync-coordinator --type=durable-objects

// wrangler.toml configuration
name = "sync-coordinator"
compatibility_date = "2024-01-15"
main = "src/index.ts"

[[durable_objects.bindings]]
name = "SYNC_COORDINATOR"
class_name = "SyncCoordinator"

[[kv_namespaces]]
binding = "SYNC_CACHE"
id = "your-kv-namespace-id"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-config-id"

// CRITICAL: Durable Object for OAuth token management
export class SyncCoordinator implements DurableObject {
  private storage: DurableObjectStorage;
  
  constructor(ctx: DurableObjectState, env: Env) {
    this.storage = ctx.storage;
  }
  
  // PATTERN: Centralized token management with automatic refresh
  async getValidToken(keapAccountId: string): Promise<string> {
    const tokens = await this.storage.get(`oauth:${keapAccountId}`);
    
    if (this.isTokenExpiringSoon(tokens.expiresAt)) {
      return await this.refreshToken(keapAccountId, tokens.refreshToken);
    }
    
    return tokens.accessToken;
  }
}
```

```typescript
// Task 2: Keap OAuth2 Integration Pseudocode
// Complete OAuth2 implementation with all Keap-specific requirements
class KeapOAuthManager {
  
  // CRITICAL: Initialize OAuth flow - redirect user to Keap
  async initiateOAuth(keapAccountId: string): Promise<string> {
    const state = crypto.randomUUID();
    await this.storage.put(`oauth_state:${state}`, { keapAccountId, timestamp: Date.now() });
    
    const authUrl = new URL('https://accounts.infusionsoft.com/app/oauth/authorize');
    authUrl.searchParams.set('client_id', env.KEAP_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', env.KEAP_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'full'); // CRITICAL: Only supported scope
    authUrl.searchParams.set('state', state);
    
    return authUrl.toString();
  }
  
  // CRITICAL: Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, state: string): Promise<TokenResponse> {
    // PATTERN: Validate state parameter to prevent CSRF
    const stateData = await this.storage.get(`oauth_state:${state}`);
    if (!stateData || Date.now() - stateData.timestamp > 600000) { // 10 min expiry
      throw new Error('Invalid or expired state');
    }
    
    const tokenRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.KEAP_CLIENT_ID,
        client_secret: env.KEAP_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: env.KEAP_REDIRECT_URI
      })
    };
    
    const response = await fetch('https://api.infusionsoft.com/token', tokenRequest);
    return await response.json();
  }
  
  // CRITICAL: Refresh token before expiry - Keap tokens expire after time
  async refreshToken(keapAccountId: string, refreshToken: string): Promise<string> {
    const credentials = btoa(`${env.KEAP_CLIENT_ID}:${env.KEAP_CLIENT_SECRET}`);
    
    const refreshRequest = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`, // CRITICAL: Required format
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    };
    
    const response = await fetch('https://api.infusionsoft.com/token', refreshRequest);
    const tokens = await response.json();
    
    // CRITICAL: Store new refresh token - Keap rotates refresh tokens
    await this.storage.put(`oauth:${keapAccountId}`, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token, // MUST use new refresh token
      expiresAt: Date.now() + (tokens.expires_in * 1000)
    });
    
    return tokens.access_token;
  }
  
  // GOTCHA: Schedule automatic refresh every 21 hours to prevent expiry
  async scheduleTokenRefresh(keapAccountId: string): Promise<void> {
    const refreshTime = Date.now() + (21 * 60 * 60 * 1000); // 21 hours
    await this.storage.put(`refresh_schedule:${keapAccountId}`, { refreshTime });
  }
}
```

```typescript
// Task 3: Next.js Migration Pseudocode
// Initialize Next.js project
npx create-next-app@latest frontend_nextjs --typescript --tailwind --app

// Migrate Supabase client (lib/supabase.ts)
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'

// CRITICAL: Update environment variables from Vite to Next.js
// Change from import.meta.env.VITE_* to process.env.NEXT_PUBLIC_*
export const supabase = createClientComponentClient<Database>()

// Migrate existing components
// PATTERN: Keep existing component logic, update imports
// CHANGE: import.meta.env.VITE_* → process.env.NEXT_PUBLIC_*
// CHANGE: Add 'use client' directive for interactive components
'use client'  // Add to components that use hooks or event handlers

export function ExistingComponent() {
  // PRESERVE: Existing component logic
  // UPDATE: Import paths and environment variables
}
```

```typescript
// Task 5: Webhook Handler Worker Pseudocode
// CRITICAL: Webhook signature verification using crypto.subtle
async function verifyKeapWebhook(request: Request, webhookSecret: string): Promise<boolean> {
  const signature = request.headers.get('X-Hook-Signature');
  if (!signature) return false;
  
  const body = await request.text();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(webhookSecret);
  const messageData = encoder.encode(body);
  
  // PATTERN: Use Web Crypto API for HMAC verification
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  
  const expectedSignature = await crypto.subtle.sign('HMAC', key, messageData);
  const providedSignature = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  
  return crypto.subtle.timingSafeEqual(expectedSignature, providedSignature);
}

// Webhook handler worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    // CRITICAL: Verify webhook signature before processing
    if (!await verifyKeapWebhook(request, env.KEAP_WEBHOOK_SECRET)) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    const webhookData = await request.json();
    const { eventType, objectKeys } = webhookData;
    
    // PATTERN: Get Durable Object ID based on Keap account
    const durableObjectId = env.SYNC_COORDINATOR.idFromName(`keap-${objectKeys[0]}`);
    const coordinator = env.SYNC_COORDINATOR.get(durableObjectId);
    
    // CRITICAL: Process webhook asynchronously to avoid blocking
    await coordinator.processWebhookEvent(eventType, objectKeys);
    
    return new Response('OK');
  }
};
```

```typescript
// Task 6: Sync Worker with Hyperdrive Pseudocode
// CRITICAL: Hyperdrive-optimized Supabase client
import { createClient } from '@supabase/supabase-js';

class HyperdriveSupabaseClient {
  private client: SupabaseClient;
  
  constructor(env: Env) {
    // PATTERN: Use Hyperdrive binding for optimized database connections
    const connectionString = env.HYPERDRIVE.connectionString;
    
    this.client = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: {
          // CRITICAL: Use Hyperdrive connection for all database operations
          host: new URL(connectionString).hostname,
          port: parseInt(new URL(connectionString).port),
          user: new URL(connectionString).username,
          password: new URL(connectionString).password,
          database: new URL(connectionString).pathname.slice(1)
        }
      }
    );
  }
  
  // PATTERN: Batch operations for efficiency
  async batchUpsertContacts(contacts: KeapContact[]): Promise<void> {
    const BATCH_SIZE = 100; // Optimize for Hyperdrive
    
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      await this.client.from('sync_contacts').upsert(batch, {
        onConflict: 'keap_id',
        ignoreDuplicates: false
      });
    }
  }
}

// CRITICAL: Rate-limited Keap API client
class RateLimitedKeapClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  
  // GOTCHA: Keap rate limits: 1500 calls/min, must respect limits
  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.waitForRateLimit();
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    
    // Reset counter every minute
    if (now - this.lastRequestTime > timeWindow) {
      this.requestCount = 0;
    }
    
    // CRITICAL: Respect 1500 requests per minute limit
    if (this.requestCount >= 1400) { // Leave buffer for safety
      const waitTime = timeWindow - (now - this.lastRequestTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
    }
    
    this.requestCount++;
    this.lastRequestTime = now;
  }
}

// Scheduled sync worker
export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const keapClient = new RateLimitedKeapClient();
    const supabaseClient = new HyperdriveSupabaseClient(env);
    
    // PATTERN: Get all active sync configurations from KV
    const syncConfigs = await env.SYNC_CACHE.list({ prefix: 'sync_config:' });
    
    for (const config of syncConfigs.keys) {
      const keapAccountId = config.name.replace('sync_config:', '');
      
      // PATTERN: Process each account through its Durable Object
      const durableObjectId = env.SYNC_COORDINATOR.idFromName(`keap-${keapAccountId}`);
      const coordinator = env.SYNC_COORDINATOR.get(durableObjectId);
      
      await coordinator.performScheduledSync(keapClient, supabaseClient);
    }
  }
};
```

```python
# Task 7: Database Schema Pseudocode
    async def sync_contacts(self, direction: str = "bidirectional"):
        # PATTERN: Always validate inputs first
        validate_sync_direction(direction)
        
        # GOTCHA: Rate limiting is critical for Keap API
        async with RateLimiter(requests_per_minute=1400) as limiter:
            # Get data from both systems
            keap_contacts = await self.keap_client.get_contacts()
            supabase_contacts = await self.supabase.get_contacts()
            
            # PATTERN: Process in batches to avoid memory issues
            for batch in chunk(keap_contacts, batch_size=100):
                await limiter.acquire()
                
                for contact in batch:
                    # CRITICAL: Check for conflicts before sync
                    conflict = await self.detect_conflict(contact)
                    
                    if conflict:
                        await self.handle_conflict(conflict)
                    else:
                        await self.sync_contact(contact, direction)
                    
                    # PATTERN: Update sync status after each operation
                    await self.update_sync_status(contact.id, "completed")

# Task 4: Webhook Handler Pseudocode  
@app.post("/webhooks/keap/contact")
async def handle_contact_webhook(request: Request):
    # CRITICAL: Verify webhook signature to prevent spoofing
    signature = request.headers.get("X-Hook-Signature")
    if not verify_webhook_signature(await request.body(), signature):
        raise HTTPException(401, "Invalid signature")
    
    # PATTERN: Parse webhook data and trigger sync
    webhook_data = await request.json()
    contact_id = webhook_data["objectKeys"][0]
    
    # GOTCHA: Queue webhook processing to avoid blocking
    await sync_queue.enqueue(sync_contact_by_id, contact_id)
    
    return {"status": "received"}
```

### Integration Points
```yaml
DATABASE:
  - migration: "sql/10-sync-tables.sql - Add all sync tables with proper indexes"
  - triggers: "Auto-update last_synced_at on data changes"
  - rls: "Service role access for sync operations"
  
CONFIG:
  - add to: .env
  - variables: "KEAP_CLIENT_ID, KEAP_CLIENT_SECRET, KEAP_WEBHOOK_SECRET"
  - pattern: "KEAP_API_BASE_URL=https://api.keap.com/v2"
  
SERVICES:
  - add to: docker-compose.yml
  - service: "sync-service" 
  - dependencies: "postgres, redis (for queuing)"
  - health checks: "HTTP endpoint for service status"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Cloudflare Workers
cd cloudflare_workers/sync-coordinator
npm install && npm run build
wrangler types  # Generate TypeScript types

cd ../webhook-handler
npm install && npm run build

cd ../sync-worker  
npm install && npm run build

# Sync Service
cd ../../backend_sync_service
python -m ruff check . --fix
python -m mypy .

# Next.js Frontend
cd ../frontend_nextjs  
npm run lint
npm run type-check
npm run build  # Ensure Next.js builds successfully

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests
```typescript
// CREATE cloudflare_workers/sync-coordinator/src/test/oauth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('KeapOAuthManager', () => {
  let mockStorage: DurableObjectStorage;
  
  beforeEach(() => {
    mockStorage = {
      get: vi.fn(),
      put: vi.fn(),
      // ... other storage methods
    } as unknown as DurableObjectStorage;
  });
  
  it('should generate valid OAuth URL', async () => {
    const manager = new KeapOAuthManager(mockStorage, mockEnv);
    const authUrl = await manager.initiateOAuth('test-keap-account');
    
    expect(authUrl).toContain('accounts.infusionsoft.com');
    expect(authUrl).toContain('scope=full');
    expect(authUrl).toContain('response_type=code');
  });
  
  it('should refresh token before expiry', async () => {
    const expiringSoon = Date.now() + 300000; // 5 minutes
    mockStorage.get.mockResolvedValue({
      accessToken: 'old-token',
      refreshToken: 'refresh-123',
      expiresAt: expiringSoon
    });
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'new-token',
        refresh_token: 'new-refresh-123',
        expires_in: 3600
      })
    });
    
    const manager = new KeapOAuthManager(mockStorage, mockEnv);
    const token = await manager.getValidToken('test-account');
    
    expect(token).toBe('new-token');
    expect(mockStorage.put).toHaveBeenCalledWith(
      'oauth:test-account',
      expect.objectContaining({
        refreshToken: 'new-refresh-123'
      })
    );
  });
  
  it('should verify webhook signatures correctly', async () => {
    const webhookSecret = 'test-secret';
    const payload = '{"test": "data"}';
    
    // Create valid HMAC signature
    const key = await crypto.subtle.importKey(
      'raw', 
      new TextEncoder().encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, 
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC', 
      key, 
      new TextEncoder().encode(payload)
    );
    
    const request = new Request('https://example.com', {
      method: 'POST',
      body: payload,
      headers: {
        'X-Hook-Signature': btoa(String.fromCharCode(...new Uint8Array(signature)))
      }
    });
    
    const isValid = await verifyKeapWebhook(request, webhookSecret);
    expect(isValid).toBe(true);
  });
});
```

```python
# CREATE backend_sync_service/tests/test_sync_engine.py
import pytest
from unittest.mock import AsyncMock, patch
import time

@pytest.mark.asyncio
async def test_oauth_token_refresh():
    """OAuth tokens are refreshed before expiry"""
    oauth_manager = OAuthManager()
    
    # Mock expired token
    with patch.object(oauth_manager, 'get_stored_token') as mock_get:
        mock_get.return_value = {
            'access_token': 'expired-token',
            'refresh_token': 'refresh-123',
            'expires_at': time.time() - 3600  # Expired 1 hour ago
        }
        
        with patch.object(oauth_manager, 'refresh_token') as mock_refresh:
            mock_refresh.return_value = 'new-token'
            
            token = await oauth_manager.get_valid_token('keap-account-123')
            assert token == 'new-token'
            mock_refresh.assert_called_once_with('refresh-123')

@pytest.mark.asyncio 
async def test_rate_limiting():
    """Rate limiting prevents API overload"""
    keap_client = RateLimitedKeapClient()
    
    # Test that rate limiter respects 1500 req/min limit
    start_time = time.time()
    
    # Simulate hitting rate limit
    keap_client.request_count = 1400
    keap_client.last_request_time = time.time()
    
    await keap_client.make_request(lambda: {"data": "test"})
    duration = time.time() - start_time
    
    # Should not delay if under limit
    assert duration < 0.1

@pytest.mark.asyncio
async def test_conflict_resolution():
    """Conflicts are detected and handled"""
    sync_engine = SyncEngine()
    
    # Create conflicting data with different timestamps
    keap_contact = {
        "id": "123", 
        "email": "new@example.com", 
        "updated_at": "2024-01-02T10:00:00Z"
    }
    supabase_contact = {
        "id": "123", 
        "email": "old@example.com", 
        "updated_at": "2024-01-01T10:00:00Z"
    }
    
    conflict = await sync_engine.detect_conflict(keap_contact, supabase_contact)
    assert conflict is not None
    assert "email" in conflict.conflict_fields
    assert conflict.resolution_strategy == "keap_wins"  # Newer timestamp
```

```bash
# Run Cloudflare Workers tests
cd cloudflare_workers/sync-coordinator
npm run test

cd ../webhook-handler  
npm run test

cd ../sync-worker
npm run test

# Run Python tests
cd ../../backend_sync_service
python -m pytest tests/ -v

# Next.js Frontend tests
cd ../frontend_nextjs
npm test
npm run e2e  # If Playwright/Cypress tests are configured
```

### Level 3: Integration Test
```bash
# Deploy Cloudflare Workers to staging
cd cloudflare_workers/sync-coordinator
wrangler deploy --env staging

cd ../webhook-handler
wrangler deploy --env staging

cd ../sync-worker
wrangler deploy --env staging

# Test Durable Object OAuth flow
curl -X POST https://sync-coordinator-staging.your-subdomain.workers.dev/oauth/initiate \
  -H "Content-Type: application/json" \
  -d '{"keap_account_id": "test-account"}'
# Expected: {"auth_url": "https://accounts.infusionsoft.com/app/oauth/authorize?..."}

# Test webhook endpoint with valid signature
curl -X POST https://webhook-handler-staging.your-subdomain.workers.dev/ \
  -H "Content-Type: application/json" \
  -H "X-Hook-Signature: $(echo -n '{"objectKeys":["12345"],"eventType":"contact.edit"}' | openssl dgst -sha256 -hmac 'your-webhook-secret' -binary | base64)" \
  -d '{"objectKeys": ["12345"], "eventType": "contact.edit"}'
# Expected: "OK"

# Test Hyperdrive database connection
curl -X GET https://sync-worker-staging.your-subdomain.workers.dev/health
# Expected: {"status": "healthy", "hyperdrive": "connected", "kv": "accessible"}

# Start local services
docker-compose up -d

# Test sync service health
curl http://localhost:8001/health
# Expected: {"status": "healthy", "services": ["keap", "supabase", "cloudflare"]}

# Test Next.js frontend
curl http://localhost:3000/dashboard
# Expected: Next.js dashboard page loads successfully

# Test Next.js API routes
curl http://localhost:3000/api/dashboard/kpis
# Expected: {"total_contacts": 1000, "total_orders": 500, ...}

# Test OAuth callback handling
curl -X GET http://localhost:3000/api/auth/keap/callback?code=test_code&state=test_state
# Expected: Redirect to dashboard with success message
```

## Final Validation Checklist
- [ ] Cloudflare Workers deployed: `wrangler deploy --env staging` for all workers
- [ ] Durable Objects accessible: Test OAuth token storage and retrieval
- [ ] KV namespaces configured: Sync metadata caching functional
- [ ] Hyperdrive connections working: Database queries optimized and fast
- [ ] OAuth2 flow complete: Full Keap authorization and token refresh cycle
- [ ] Webhook verification working: HMAC signature validation passes
- [ ] Rate limiting functional: 1500 req/min Keap API limit respected
- [ ] All sync services pass health checks: `curl localhost:8001/health`
- [ ] No linting errors: `ruff check backend_sync_service/`
- [ ] No type errors: `mypy backend_sync_service/`
- [ ] All tests pass: `pytest backend_sync_service/tests/ -v`
- [ ] Cloudflare Workers tests pass: `npm run test` in all worker directories
- [ ] Next.js builds and deploys: `npm run build` in frontend_nextjs/
- [ ] Vite frontend deprecated: Old frontend/ directory removed after migration
- [ ] Manual sync works: Test sync button in dashboard
- [ ] Webhooks receive and process data: Check Durable Object logs
- [ ] Conflicts are handled: Create conflicting data and verify resolution
- [ ] Dashboard displays real-time data: Verify charts update on data changes
- [ ] Token refresh automation: 21-hour refresh schedule functioning
- [ ] All environment variables documented: .env.example includes Cloudflare vars
- [ ] Production deployment ready: Staging environment fully functional

---

## Anti-Patterns to Avoid
- ❌ Don't ignore Keap API rate limits - implement proper backoff
- ❌ Don't store API keys in code - use environment variables only  
- ❌ Don't sync large datasets without batching - memory will overflow
- ❌ Don't trust webhook data without signature verification
- ❌ Don't create sync loops - implement conflict resolution properly
- ❌ Don't block the main thread with sync operations - use async queues
- ❌ Don't ignore database constraints - validate data before insertion
- ❌ Don't expose sensitive data in logs - sanitize debug output

## Security Considerations
- All Keap API credentials stored as environment variables
- Webhook signature verification for all incoming requests
- Supabase RLS policies restrict data access by user role
- Service-to-service authentication using JWT tokens
- All database connections use SSL encryption
- API rate limiting to prevent abuse
- Input validation on all user-facing endpoints
- Comprehensive audit logging for all sync operations

## Performance Optimizations
- Connection pooling for database and HTTP clients
- Caching frequently accessed data with Redis
- Batch operations for large datasets
- Background job processing with Celery/FastAPI queues
- Database indexes on frequently queried columns
- Lazy loading for dashboard components
- Real-time subscriptions only for critical data updates