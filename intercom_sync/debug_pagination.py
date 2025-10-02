#!/usr/bin/env python3
"""
Debug the pagination issue in conversation listing
"""
import os
from dotenv import load_dotenv
from intercom_client import IntercomClient
from rich.console import Console

load_dotenv()
console = Console()

def debug_pagination():
    """Debug conversation pagination"""
    try:
        client = IntercomClient()

        console.print("[yellow]Testing conversation pagination...[/yellow]")

        # Test the generator function
        conversation_count = 0
        page_count = 0

        console.print("[cyan]Starting to iterate through conversations...[/cyan]")

        for conv in client.list_all_conversations(batch_size=5):
            conversation_count += 1
            if conversation_count % 5 == 0:
                page_count += 1
                console.print(f"  Page {page_count}: {conversation_count} conversations so far...")

            # Stop after 20 conversations for testing
            if conversation_count >= 20:
                console.print("[yellow]Stopping at 20 conversations for testing[/yellow]")
                break

        console.print(f"[green]✓ Successfully paginated through {conversation_count} conversations[/green]")

        # Now test the sync process with a small batch
        console.print("\n[yellow]Testing sync with small batch...[/yellow]")

        from sync_orchestrator import IntercomSyncOrchestrator

        orchestrator = IntercomSyncOrchestrator(max_workers=2)

        # Get first 5 conversations
        conversations_to_sync = []
        for i, conv in enumerate(client.list_all_conversations(batch_size=5)):
            conversations_to_sync.append(conv['id'])
            if i >= 4:  # Get 5 conversations
                break

        console.print(f"Found {len(conversations_to_sync)} conversations to sync")

        # Try to sync one conversation
        if conversations_to_sync:
            conv_id = conversations_to_sync[0]
            console.print(f"[yellow]Syncing conversation {conv_id}...[/yellow]")

            # Fetch full conversation
            full_conv = client.get_conversation_with_parts(conv_id)

            # Count parts
            parts = full_conv.get('conversation_parts', {}).get('conversation_parts', [])
            source = full_conv.get('source')

            console.print(f"Conversation has {len(parts)} parts + {'source' if source else 'no source'}")

            # Try to sync it
            success = orchestrator.sync_conversation(full_conv)

            if success:
                console.print(f"[green]✓ Successfully synced conversation {conv_id}[/green]")
            else:
                console.print(f"[red]✗ Failed to sync conversation {conv_id}[/red]")

    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")
        import traceback
        console.print(f"[red]{traceback.format_exc()}[/red]")

if __name__ == '__main__':
    debug_pagination()