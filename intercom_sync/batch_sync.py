#!/usr/bin/env python3
"""
Batch sync specific conversations to Supabase
"""
import os
import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from intercom_client import IntercomClient
from supabase_manager import SupabaseManager
from sync_orchestrator import IntercomSyncOrchestrator
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

load_dotenv()
console = Console()

def sync_recent_conversations(days_back=7, max_conversations=10):
    """Sync recent conversations to Supabase"""

    # Initialize clients
    intercom_client = IntercomClient()
    orchestrator = IntercomSyncOrchestrator(max_workers=1)

    # Get conversations from specified days back
    since = datetime.now(timezone.utc) - timedelta(days=days_back)

    console.print(f"\n[bold cyan]Fetching conversations from last {days_back} days...[/bold cyan]")

    # Collect conversations first
    conversations = []
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Fetching conversations...", total=None)

        try:
            for conv in intercom_client.list_all_conversations(updated_after=since, batch_size=20):
                conversations.append(conv)
                progress.update(task, description=f"Found {len(conversations)} conversations...")

                if len(conversations) >= max_conversations:
                    break
        except Exception as e:
            console.print(f"[red]Error fetching conversations: {e}[/red]")
            return

    if not conversations:
        console.print("[yellow]No conversations found in the specified time range[/yellow]")
        return

    console.print(f"\n[green]Found {len(conversations)} conversations to sync[/green]\n")

    # Sync admins and tags first
    console.print("[dim]Syncing admins and tags...[/dim]")
    orchestrator.sync_admins()
    orchestrator.sync_tags()

    # Sync each conversation
    success_count = 0
    failed_count = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Syncing conversations...", total=len(conversations))

        for i, conv in enumerate(conversations):
            conv_id = conv.get('id')
            user_info = conv.get('source', {}).get('author', {})
            user_name = user_info.get('name', 'Unknown')

            progress.update(task, description=f"Syncing conversation {i+1}/{len(conversations)} - {user_name}")

            try:
                # Sync the conversation
                success = orchestrator.sync_conversation(conv)

                if success:
                    success_count += 1
                    console.print(f"  [green]✓[/green] Synced conversation {conv_id} ({user_name})")
                else:
                    failed_count += 1
                    console.print(f"  [red]✗[/red] Failed to sync conversation {conv_id}")

            except Exception as e:
                failed_count += 1
                console.print(f"  [red]✗[/red] Error syncing {conv_id}: {e}")

            progress.advance(task)

    # Print summary
    console.print(f"\n[bold]Sync Summary:[/bold]")
    console.print(f"  [green]Successfully synced: {success_count} conversations[/green]")
    if failed_count > 0:
        console.print(f"  [red]Failed: {failed_count} conversations[/red]")

    return success_count, failed_count

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Batch sync Intercom conversations')
    parser.add_argument('--days', type=int, default=7, help='Number of days to look back')
    parser.add_argument('--max', type=int, default=10, help='Maximum conversations to sync')

    args = parser.parse_args()

    sync_recent_conversations(days_back=args.days, max_conversations=args.max)