#!/usr/bin/env python3
"""
Check the progress of Intercom sync
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from rich.console import Console
from rich.table import Table

load_dotenv()
console = Console()

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def check_counts():
    """Check current counts in Supabase"""

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

    # Create summary table
    table = Table(title="Intercom Sync Progress")
    table.add_column("Data Type", style="cyan", no_wrap=True)
    table.add_column("Count", style="green", justify="right")

    table.add_row("Conversations", str(conversation_count))
    table.add_row("Messages", str(message_count))
    table.add_row("Users", str(user_count))
    table.add_row("Admins", str(admin_count))
    table.add_row("Tags", str(tag_count))

    console.print(table)

    # Get recent conversations
    recent = supabase.table('intercom_conversations').select(
        'conversation_id, created_at, updated_at'
    ).order('created_at', desc=True).limit(5).execute()

    if recent.data:
        console.print("\n[bold]Recent Conversations:[/bold]")
        for conv in recent.data:
            console.print(f"  • {conv['conversation_id']} - Created: {conv['created_at'][:10]}")

    return {
        'conversations': conversation_count,
        'messages': message_count,
        'users': user_count,
        'admins': admin_count,
        'tags': tag_count
    }

if __name__ == '__main__':
    check_counts()