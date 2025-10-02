#!/usr/bin/env python3
"""
CLI for Intercom to Supabase sync
"""
import os
import sys
from datetime import datetime, timezone, timedelta
import click
from dotenv import load_dotenv
from rich.console import Console

from sync_orchestrator import IntercomSyncOrchestrator

# Load environment variables
load_dotenv()
console = Console()


@click.group()
def cli():
    """Intercom to Supabase Data Sync Tool"""
    pass


@cli.command()
@click.option(
    '--start-date',
    type=click.DateTime(),
    help='Start date for sync (YYYY-MM-DD)'
)
@click.option(
    '--end-date',
    type=click.DateTime(),
    help='End date for sync (YYYY-MM-DD)'
)
@click.option(
    '--batch-size',
    type=int,
    default=50,
    help='Number of conversations to process in parallel'
)
@click.option(
    '--max-workers',
    type=int,
    default=5,
    help='Maximum number of parallel workers'
)
def full_sync(start_date, end_date, batch_size, max_workers):
    """Run a full sync of all Intercom conversations"""
    try:
        orchestrator = IntercomSyncOrchestrator(max_workers=max_workers)

        # Convert dates to timezone aware
        if start_date:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date:
            end_date = end_date.replace(tzinfo=timezone.utc)

        orchestrator.run_full_sync(
            start_date=start_date,
            end_date=end_date,
            batch_size=batch_size
        )

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        sys.exit(1)


@cli.command()
@click.option(
    '--hours-back',
    type=int,
    default=24,
    help='Number of hours to look back for changes'
)
@click.option(
    '--max-workers',
    type=int,
    default=5,
    help='Maximum number of parallel workers'
)
def incremental_sync(hours_back, max_workers):
    """Run an incremental sync for recent changes"""
    try:
        orchestrator = IntercomSyncOrchestrator(max_workers=max_workers)
        orchestrator.run_incremental_sync(hours_back=hours_back)

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        sys.exit(1)


@cli.command()
@click.option(
    '--conversation-id',
    required=True,
    help='Specific conversation ID to sync'
)
def sync_conversation(conversation_id):
    """Sync a specific conversation by ID"""
    try:
        orchestrator = IntercomSyncOrchestrator()

        console.print(f"[yellow]Syncing conversation {conversation_id}...[/yellow]")

        # Sync admins and tags first
        orchestrator.sync_admins()
        orchestrator.sync_tags()

        # Fetch and sync the conversation
        conversation = orchestrator.intercom.get_conversation_with_parts(conversation_id)
        success = orchestrator.sync_conversation(conversation)

        if success:
            console.print(f"[green]✓ Successfully synced conversation {conversation_id}[/green]")
        else:
            console.print(f"[red]✗ Failed to sync conversation {conversation_id}[/red]")
            sys.exit(1)

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        sys.exit(1)


@cli.command()
def test_connection():
    """Test connection to both Intercom and Supabase"""
    try:
        console.print("[yellow]Testing connections...[/yellow]")

        # Test Intercom
        try:
            from intercom_client import IntercomClient
            intercom = IntercomClient()
            admins = intercom.list_admins()
            console.print(f"[green]✓ Intercom connection successful ({len(admins)} admins found)[/green]")
        except Exception as e:
            console.print(f"[red]✗ Intercom connection failed: {e}[/red]")
            sys.exit(1)

        # Test Supabase
        try:
            from supabase_manager import SupabaseManager
            supabase = SupabaseManager()
            # Try to query sync logs to test connection
            result = supabase.client.table('intercom_sync_logs').select('sync_id').limit(1).execute()
            console.print("[green]✓ Supabase connection successful[/green]")
        except Exception as e:
            console.print(f"[red]✗ Supabase connection failed: {e}[/red]")
            sys.exit(1)

        console.print("\n[bold green]All connections successful![/bold green]")

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        sys.exit(1)


@cli.command()
def apply_schema():
    """Apply the database schema to Supabase"""
    try:
        console.print("[yellow]Applying database schema...[/yellow]")

        # Read the schema file
        schema_path = os.path.join(os.path.dirname(__file__), 'database', 'schema.sql')
        with open(schema_path, 'r') as f:
            schema_sql = f.read()

        # Apply via Supabase
        from supabase_manager import SupabaseManager
        supabase = SupabaseManager()

        # Note: For production, you might want to use Supabase migrations
        # This is a simplified approach for direct execution
        console.print("[yellow]Please run the schema.sql file directly in your Supabase SQL editor[/yellow]")
        console.print(f"Schema file location: {schema_path}")
        console.print("\n[cyan]Steps:[/cyan]")
        console.print("1. Go to your Supabase dashboard")
        console.print("2. Navigate to SQL Editor")
        console.print("3. Copy and paste the contents of schema.sql")
        console.print("4. Click 'Run' to execute")

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        sys.exit(1)


@cli.command()
def sync_status():
    """Check the status of recent syncs"""
    try:
        from supabase_manager import SupabaseManager
        supabase = SupabaseManager()

        # Get recent sync logs
        result = supabase.client.table('intercom_sync_logs').select(
            'sync_id, sync_type, started_at, completed_at, status, '
            'conversations_synced, messages_synced, users_synced'
        ).order('started_at', desc=True).limit(10).execute()

        if not result.data:
            console.print("[yellow]No sync logs found[/yellow]")
            return

        console.print("[bold]Recent Sync Operations:[/bold]\n")

        for log in result.data:
            status_color = {
                'running': 'yellow',
                'completed': 'green',
                'failed': 'red',
                'partial': 'orange'
            }.get(log['status'], 'white')

            console.print(f"[{status_color}]● {log['status'].upper()}[/{status_color}] - {log['sync_type']} sync")
            console.print(f"  Started: {log['started_at']}")
            if log['completed_at']:
                console.print(f"  Completed: {log['completed_at']}")
            if log['conversations_synced']:
                console.print(f"  Conversations: {log['conversations_synced']}")
            if log['messages_synced']:
                console.print(f"  Messages: {log['messages_synced']}")
            if log['users_synced']:
                console.print(f"  Users: {log['users_synced']}")
            console.print()

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        sys.exit(1)


@cli.command()
@click.option(
    '--interval',
    type=int,
    default=60,
    help='Sync interval in minutes'
)
def watch(interval):
    """Run incremental sync continuously at specified interval"""
    import time

    try:
        console.print(f"[bold blue]Starting watch mode (sync every {interval} minutes)[/bold blue]")
        console.print("[dim]Press Ctrl+C to stop[/dim]\n")

        while True:
            try:
                console.print(f"\n[cyan]Running sync at {datetime.now()}[/cyan]")
                orchestrator = IntercomSyncOrchestrator()
                orchestrator.run_incremental_sync(hours_back=interval/60*2)  # Look back twice the interval

                console.print(f"[dim]Next sync in {interval} minutes...[/dim]")
                time.sleep(interval * 60)

            except KeyboardInterrupt:
                raise
            except Exception as e:
                console.print(f"[red]Sync error: {e}[/red]")
                console.print(f"[yellow]Retrying in {interval} minutes...[/yellow]")
                time.sleep(interval * 60)

    except KeyboardInterrupt:
        console.print("\n[yellow]Watch mode stopped[/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        sys.exit(1)


if __name__ == '__main__':
    cli()