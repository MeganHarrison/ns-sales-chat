#!/usr/bin/env python3
"""
Test script to list and sync recent conversations
"""
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from intercom_client import IntercomClient
from supabase_manager import SupabaseManager
from sync_orchestrator import IntercomSyncOrchestrator
from rich.console import Console

load_dotenv()
console = Console()

def list_recent_conversations():
    """List recent conversations from Intercom"""
    client = IntercomClient()

    # Get conversations from last 7 days
    since = datetime.now(timezone.utc) - timedelta(days=7)

    console.print(f"\n[bold green]Fetching conversations updated since {since}[/bold green]\n")

    conversations = []
    for conv in client.list_all_conversations(updated_after=since, batch_size=10):
        conversations.append(conv)
        if len(conversations) >= 5:  # Just get first 5 for testing
            break

    if conversations:
        console.print(f"Found {len(conversations)} recent conversations:\n")
        for conv in conversations:
            conv_id = conv.get('id', 'Unknown')
            created_at = datetime.fromtimestamp(conv.get('created_at', 0))
            updated_at = datetime.fromtimestamp(conv.get('updated_at', 0))
            source = conv.get('source', {})
            author = source.get('author', {})
            user_name = author.get('name', 'Unknown')
            user_email = author.get('email', 'No email')

            console.print(f"[cyan]ID:[/cyan] {conv_id}")
            console.print(f"  [dim]User:[/dim] {user_name} ({user_email})")
            console.print(f"  [dim]Created:[/dim] {created_at}")
            console.print(f"  [dim]Updated:[/dim] {updated_at}")
            console.print()

        return conversations
    else:
        console.print("[yellow]No recent conversations found[/yellow]")
        return []

def sync_specific_conversation(conversation_id):
    """Sync a specific conversation"""
    orchestrator = IntercomSyncOrchestrator(max_workers=1)
    console.print(f"\n[bold blue]Syncing conversation {conversation_id}...[/bold blue]\n")

    try:
        orchestrator.sync_single_conversation(conversation_id)
        console.print(f"[green]✓ Successfully synced conversation {conversation_id}[/green]")
    except Exception as e:
        console.print(f"[red]✗ Failed to sync conversation {conversation_id}: {e}[/red]")

if __name__ == "__main__":
    # List recent conversations
    conversations = list_recent_conversations()

    if conversations:
        # Sync the first conversation as a test
        first_conv_id = conversations[0].get('id')
        if first_conv_id:
            sync_specific_conversation(first_conv_id)