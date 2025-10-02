#!/usr/bin/env python3
"""
Continuous sync for Intercom conversations
Runs multiple batches until no more conversations are found
"""
import os
from dotenv import load_dotenv
from intercom_client import IntercomClient
from sync_orchestrator import IntercomSyncOrchestrator
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
import time

load_dotenv()
console = Console()

def continuous_sync(batch_size=100, max_batches=10):
    """Continuously sync conversations until no more are found"""
    try:
        client = IntercomClient()
        orchestrator = IntercomSyncOrchestrator(max_workers=5)

        console.print(f"[yellow]Starting continuous sync with batch size {batch_size}...[/yellow]")

        # First sync admins and tags once
        console.print("[yellow]Syncing admins and tags...[/yellow]")
        orchestrator.sync_admins()
        orchestrator.sync_tags()

        total_conversations_synced = 0
        total_messages_synced = 0
        batch_count = 0

        for batch_num in range(1, max_batches + 1):
            console.print(f"\n[cyan]═══ Batch {batch_num}/{max_batches} ═══[/cyan]")

            # Get conversations to sync
            conversations_to_sync = []
            console.print("[yellow]Collecting conversation IDs...[/yellow]")

            # Skip conversations we've already processed by using a higher starting_after
            count = 0
            for conv in client.list_all_conversations(batch_size=batch_size):
                conversations_to_sync.append(conv['id'])
                count += 1
                if count >= batch_size:
                    break

            if not conversations_to_sync:
                console.print("[green]✓ No more conversations to sync[/green]")
                break

            console.print(f"[green]Found {len(conversations_to_sync)} conversations to sync[/green]")

            # Sync conversations with progress bar
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
                console=console
            ) as progress:

                sync_task = progress.add_task(
                    f"[cyan]Syncing batch {batch_num}...",
                    total=len(conversations_to_sync)
                )

                batch_success_count = 0
                batch_error_count = 0

                for conv_id in conversations_to_sync:
                    try:
                        # Fetch full conversation
                        full_conv = client.get_conversation_with_parts(conv_id)

                        # Sync it
                        success = orchestrator.sync_conversation(full_conv)

                        if success:
                            batch_success_count += 1
                        else:
                            batch_error_count += 1

                    except Exception as e:
                        console.print(f"[red]Error syncing {conv_id}: {e}[/red]")
                        batch_error_count += 1

                    progress.update(sync_task, advance=1)

            # Update totals
            total_conversations_synced += batch_success_count
            batch_count += 1

            console.print(f"[bold green]Batch {batch_num} completed![/bold green]")
            console.print(f"Successfully synced: {batch_success_count}")
            console.print(f"Errors: {batch_error_count}")

            # Show running totals
            console.print(f"[bold cyan]Running totals:[/bold cyan]")
            console.print(f"Conversations synced this run: {total_conversations_synced}")
            console.print(f"Total conversations in DB: {orchestrator.stats['conversations_synced']}")
            console.print(f"Total messages in DB: {orchestrator.stats['messages_synced']}")
            console.print(f"Total users in DB: {orchestrator.stats['users_synced']}")

            # Small delay between batches to be respectful to API
            if batch_num < max_batches:
                console.print("[yellow]Waiting 5 seconds before next batch...[/yellow]")
                time.sleep(5)

        console.print(f"\n[bold green]✓ Continuous sync completed![/bold green]")
        console.print(f"Processed {batch_count} batches")
        console.print(f"Conversations synced this run: {total_conversations_synced}")
        console.print(f"Final stats:")
        console.print(f"  Total conversations: {orchestrator.stats['conversations_synced']}")
        console.print(f"  Total messages: {orchestrator.stats['messages_synced']}")
        console.print(f"  Total users: {orchestrator.stats['users_synced']}")

    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")
        import traceback
        console.print(f"[red]{traceback.format_exc()}[/red]")

if __name__ == '__main__':
    # Sync up to 500 conversations (5 batches of 100)
    continuous_sync(batch_size=100, max_batches=5)