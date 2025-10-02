#!/usr/bin/env python3
"""
Check synced data in Supabase
"""
import os
from datetime import datetime
from dotenv import load_dotenv
from supabase_manager import SupabaseManager
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()

def check_synced_data():
    """Check the synced data in Supabase"""
    manager = SupabaseManager()

    # Get recent conversations
    console.print("\n[bold cyan]Recent Synced Conversations:[/bold cyan]\n")

    conversations = manager.client.table('intercom_conversations').select(
        "conversation_id, created_at, updated_at, state, priority, admin_assignee_id, synced_at"
    ).order('updated_at', desc=True).limit(10).execute()

    if conversations.data:
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Conv ID", style="cyan")
        table.add_column("State", style="green")
        table.add_column("Priority", style="yellow")
        table.add_column("Created", style="dim")
        table.add_column("Updated", style="dim")
        table.add_column("Synced At", style="blue")

        for conv in conversations.data:
            created = datetime.fromisoformat(conv['created_at'].replace('Z', '+00:00'))
            updated = datetime.fromisoformat(conv['updated_at'].replace('Z', '+00:00'))
            synced = datetime.fromisoformat(conv['synced_at'].replace('Z', '+00:00'))

            table.add_row(
                str(conv['conversation_id']),
                conv['state'] or 'N/A',
                conv['priority'] or 'N/A',
                created.strftime('%m/%d %H:%M'),
                updated.strftime('%m/%d %H:%M'),
                synced.strftime('%m/%d %H:%M')
            )

        console.print(table)

    # Get message counts
    console.print("\n[bold cyan]Message Statistics:[/bold cyan]\n")

    messages = manager.client.table('intercom_messages').select(
        "conversation_id", count='exact'
    ).execute()

    total_messages = messages.count if messages else 0

    # Get unique conversations with messages
    unique_convs = manager.client.table('intercom_messages').select(
        "conversation_id"
    ).execute()

    unique_conv_ids = set(msg['conversation_id'] for msg in (unique_convs.data or []))

    console.print(f"  Total messages synced: [green]{total_messages}[/green]")
    console.print(f"  Conversations with messages: [green]{len(unique_conv_ids)}[/green]")

    # Get user counts
    console.print("\n[bold cyan]User Statistics:[/bold cyan]\n")

    users = manager.client.table('intercom_users').select(
        "user_id, name, email", count='exact'
    ).limit(5).execute()

    console.print(f"  Total users synced: [green]{users.count if users else 0}[/green]")

    if users.data:
        console.print("\n  Recent users:")
        for user in users.data[:5]:
            console.print(f"    • {user['name']} ({user['email']})")

    # Get sync log info
    console.print("\n[bold cyan]Recent Sync Operations:[/bold cyan]\n")

    logs = manager.client.table('intercom_sync_logs').select(
        "sync_type, status, started_at, completed_at, conversations_synced, messages_synced"
    ).order('started_at', desc=True).limit(5).execute()

    if logs.data:
        for log in logs.data:
            status_color = "green" if log['status'] == 'completed' else "yellow" if log['status'] == 'running' else "red"
            console.print(f"  [{status_color}]{log['status'].upper()}[/{status_color}] - {log['sync_type']}")
            if log['conversations_synced']:
                console.print(f"    Conversations: {log['conversations_synced']}, Messages: {log['messages_synced']}")

if __name__ == "__main__":
    check_synced_data()