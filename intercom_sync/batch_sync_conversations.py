#!/usr/bin/env python3
"""
Sync conversations in manageable batches
"""
import os
from dotenv import load_dotenv
from intercom_client import IntercomClient
from sync_orchestrator import IntercomSyncOrchestrator
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

load_dotenv()
console = Console()

def batch_sync_conversations(max_conversations=100):
    """Sync conversations in batches"""
    try:
        client = IntercomClient()
        orchestrator = IntercomSyncOrchestrator(max_workers=3)

        console.print(f"[yellow]Syncing up to {max_conversations} conversations...[/yellow]")

        # First sync admins and tags
        console.print("[yellow]Syncing admins and tags...[/yellow]")
        orchestrator.sync_admins()
        orchestrator.sync_tags()

        # Get conversations to sync
        conversations_to_sync = []
        console.print("[yellow]Collecting conversation IDs...[/yellow]")

        count = 0
        for conv in client.list_all_conversations(batch_size=50):
            conversations_to_sync.append(conv['id'])
            count += 1
            if count >= max_conversations:
                break

        console.print(f"[green]Found {len(conversations_to_sync)} conversations to sync[/green]")

        if not conversations_to_sync:
            console.print("[yellow]No conversations to sync[/yellow]")
            return

        # Sync conversations with progress bar
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=console
        ) as progress:

            sync_task = progress.add_task(
                "[cyan]Syncing conversations...",
                total=len(conversations_to_sync)
            )

            success_count = 0
            error_count = 0

            for conv_id in conversations_to_sync:
                try:
                    # Fetch full conversation
                    full_conv = client.get_conversation_with_parts(conv_id)

                    # Sync it
                    success = orchestrator.sync_conversation(full_conv)

                    if success:
                        success_count += 1
                    else:
                        error_count += 1

                except Exception as e:
                    console.print(f"[red]Error syncing {conv_id}: {e}[/red]")
                    error_count += 1

                progress.update(sync_task, advance=1)

        console.print(f"\n[bold green]Sync completed![/bold green]")
        console.print(f"Successfully synced: {success_count}")
        console.print(f"Errors: {error_count}")
        console.print(f"Total conversations: {orchestrator.stats['conversations_synced']}")
        console.print(f"Total messages: {orchestrator.stats['messages_synced']}")
        console.print(f"Total users: {orchestrator.stats['users_synced']}")

    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")
        import traceback
        console.print(f"[red]{traceback.format_exc()}[/red]")

if __name__ == '__main__':
    batch_sync_conversations(100)  # Sync 100 conversations