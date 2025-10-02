#!/usr/bin/env python3
"""
Test Intercom API connection and conversation listing
"""
import os
from dotenv import load_dotenv
from intercom_client import IntercomClient
from rich.console import Console

load_dotenv()
console = Console()

def test_intercom():
    """Test Intercom API"""
    try:
        client = IntercomClient()

        console.print("[yellow]Testing Intercom API...[/yellow]")

        # Test basic connection
        admins = client.list_admins()
        console.print(f"[green]✓ Connected - Found {len(admins)} admins[/green]")

        # Test conversation listing with small batch
        console.print("[yellow]Testing conversation listing...[/yellow]")

        conversations = client.list_conversations(per_page=5)
        console.print(f"[green]✓ Listed conversations - Found {len(conversations.get('conversations', []))} conversations[/green]")

        # Print some conversation details
        for conv in conversations.get('conversations', [])[:3]:
            console.print(f"  • Conversation {conv['id']} - Created: {conv.get('created_at', 'N/A')}")

        # Test pagination info
        pages = conversations.get('pages', {})
        if pages.get('next'):
            console.print(f"[cyan]More conversations available - Next page: {pages['next'].get('starting_after', 'N/A')}[/cyan]")
        else:
            console.print("[cyan]No more pages available[/cyan]")

        # Try getting a specific conversation with details
        if conversations.get('conversations'):
            conv_id = conversations['conversations'][0]['id']
            console.print(f"[yellow]Testing conversation details for {conv_id}...[/yellow]")

            full_conv = client.get_conversation_with_parts(conv_id)
            parts_count = len(full_conv.get('conversation_parts', {}).get('conversation_parts', []))
            console.print(f"[green]✓ Got conversation details - {parts_count} parts[/green]")

        return True

    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")
        import traceback
        console.print(f"[red]{traceback.format_exc()}[/red]")
        return False

if __name__ == '__main__':
    test_intercom()