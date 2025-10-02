#!/usr/bin/env python3
"""
Intercom Sync Dashboard - Monitor sync progress and statistics
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from rich.console import Console
from rich.table import Table
from rich.layout import Layout
from rich.panel import Panel
from rich.columns import Columns
import time
from datetime import datetime, timezone

load_dotenv()
console = Console()

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def get_detailed_stats():
    """Get detailed statistics from Supabase"""

    # Count messages
    messages = supabase.table('intercom_messages').select('message_id', count='exact').execute()
    message_count = messages.count if messages else 0

    # Count conversations
    conversations = supabase.table('intercom_conversations').select('conversation_id', count='exact').execute()
    conversation_count = conversations.count if conversations else 0

    # Count users
    users = supabase.table('intercom_users').select('user_id', count='exact').execute()
    user_count = users.count if users else 0

    # Count admins
    admins = supabase.table('intercom_admins').select('admin_id', count='exact').execute()
    admin_count = admins.count if admins else 0

    # Count tags
    tags = supabase.table('intercom_tags').select('tag_id', count='exact').execute()
    tag_count = tags.count if tags else 0

    # Get recent conversations with more details
    recent_convs = supabase.table('intercom_conversations').select(
        'conversation_id, created_at, updated_at, state, waiting_since, snoozed_until'
    ).order('created_at', desc=True).limit(10).execute()

    # Get message distribution by author type
    message_types = supabase.table('intercom_messages').select(
        'author_type', count='exact'
    ).execute()

    # Get conversations by state
    conv_states = supabase.table('intercom_conversations').select(
        'state', count='exact'
    ).execute()

    return {
        'counts': {
            'conversations': conversation_count,
            'messages': message_count,
            'users': user_count,
            'admins': admin_count,
            'tags': tag_count
        },
        'recent_conversations': recent_convs.data if recent_convs else [],
        'message_types': message_types.data if message_types else [],
        'conversation_states': conv_states.data if conv_states else []
    }

def create_counts_table(stats):
    """Create main counts table"""
    table = Table(title="📊 Intercom Sync Statistics", show_header=True, header_style="bold magenta")
    table.add_column("Data Type", style="cyan", no_wrap=True)
    table.add_column("Count", style="green", justify="right")
    table.add_column("Status", style="yellow")

    counts = stats['counts']

    # Add rows with status indicators
    table.add_row("Conversations", str(counts['conversations']), "✓ Active" if counts['conversations'] > 0 else "⚠ None")
    table.add_row("Messages", str(counts['messages']), "✓ Active" if counts['messages'] > 0 else "⚠ None")
    table.add_row("Users", str(counts['users']), "✓ Active" if counts['users'] > 0 else "⚠ None")
    table.add_row("Admins", str(counts['admins']), "✓ Active" if counts['admins'] > 0 else "⚠ None")
    table.add_row("Tags", str(counts['tags']), "✓ Active" if counts['tags'] > 0 else "⚠ None")

    return table

def create_recent_conversations_table(recent_convs):
    """Create recent conversations table"""
    table = Table(title="💬 Recent Conversations", show_header=True, header_style="bold blue")
    table.add_column("Conversation ID", style="cyan", no_wrap=True)
    table.add_column("Created", style="green")
    table.add_column("State", style="yellow")
    table.add_column("Updated", style="dim")

    for conv in recent_convs[:5]:  # Show only top 5
        created_date = conv['created_at'][:10] if conv['created_at'] else 'N/A'
        updated_date = conv['updated_at'][:10] if conv['updated_at'] else 'N/A'
        state = conv.get('state', 'unknown')

        table.add_row(
            conv['conversation_id'][-12:] + "...",  # Show last 12 chars
            created_date,
            state,
            updated_date
        )

    return table

def display_dashboard():
    """Display the sync dashboard"""
    console.clear()

    # Get statistics
    stats = get_detailed_stats()

    # Create timestamp
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Create main layout
    layout = Layout()

    # Main counts table
    counts_table = create_counts_table(stats)

    # Recent conversations
    recent_table = create_recent_conversations_table(stats['recent_conversations'])

    # Create summary panel
    total_data_points = sum(stats['counts'].values())
    summary_text = f"""
🔄 Sync Status: {"Active" if total_data_points > 0 else "No Data"}
📈 Total Data Points: {total_data_points:,}
⏰ Last Updated: {now}
🎯 Next Recommended Action: {"Continue sync batches" if stats['counts']['conversations'] < 1000 else "Sync complete"}
    """.strip()

    summary_panel = Panel(summary_text, title="🚀 Quick Summary", border_style="green")

    # Display everything
    console.print(summary_panel)
    console.print()
    console.print(counts_table)
    console.print()
    console.print(recent_table)

    # Show sync recommendations
    counts = stats['counts']
    if counts['conversations'] == 0:
        console.print("\n[red]⚠ No conversations synced yet. Run: python batch_sync_conversations.py[/red]")
    elif counts['conversations'] < 100:
        console.print(f"\n[yellow]📝 Only {counts['conversations']} conversations synced. Consider running more batches.[/yellow]")
    elif counts['messages'] / counts['conversations'] < 5:
        console.print(f"\n[yellow]💬 Low message ratio ({counts['messages']}/{counts['conversations']} = {counts['messages']/counts['conversations']:.1f}). Some conversations may be missing messages.[/yellow]")
    else:
        console.print(f"\n[green]✅ Good sync progress! {counts['conversations']} conversations with {counts['messages']} messages.[/green]")

def watch_dashboard(refresh_seconds=30):
    """Watch dashboard with auto-refresh"""
    try:
        while True:
            display_dashboard()
            console.print(f"\n[dim]Refreshing in {refresh_seconds} seconds... (Ctrl+C to exit)[/dim]")
            time.sleep(refresh_seconds)
    except KeyboardInterrupt:
        console.print("\n[yellow]Dashboard stopped.[/yellow]")

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--watch':
        watch_dashboard()
    else:
        display_dashboard()