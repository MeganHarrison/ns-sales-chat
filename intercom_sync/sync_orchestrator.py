"""
Main orchestrator for syncing Intercom data to Supabase
"""
import os
import sys
import json
import asyncio
from typing import Dict, List, Optional, Set
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeRemainingColumn
from rich.logging import RichHandler

from intercom_client import IntercomClient, IntercomAPIError
from supabase_manager import SupabaseManager

# Configure rich console and logging
console = Console()
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(console=console, rich_tracebacks=True)]
)
logger = logging.getLogger(__name__)


class IntercomSyncOrchestrator:
    """Orchestrates the sync process between Intercom and Supabase"""

    def __init__(
        self,
        intercom_token: str = None,
        supabase_url: str = None,
        supabase_key: str = None,
        max_workers: int = 5
    ):
        """
        Initialize sync orchestrator

        Args:
            intercom_token: Intercom API access token
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
            max_workers: Maximum number of parallel workers
        """
        self.intercom = IntercomClient(intercom_token)
        self.supabase = SupabaseManager(supabase_url, supabase_key)
        self.max_workers = max_workers
        self.sync_log = None
        self.stats = {
            'conversations_synced': 0,
            'messages_synced': 0,
            'users_synced': 0,
            'admins_synced': 0,
            'tags_synced': 0,
            'errors': []
        }
        self.processed_users: Set[str] = set()
        self.processed_admins: Set[str] = set()

    def sync_admins(self) -> int:
        """
        Sync all admins from Intercom

        Returns:
            Number of admins synced
        """
        try:
            console.print("[yellow]Syncing admins...[/yellow]")
            admins = self.intercom.list_admins()
            count = 0

            for admin in admins:
                try:
                    self.supabase.upsert_admin(admin)
                    self.processed_admins.add(admin['id'])
                    count += 1
                except Exception as e:
                    logger.error(f"Error syncing admin {admin.get('id')}: {e}")
                    self.stats['errors'].append(f"Admin {admin.get('id')}: {str(e)}")

            console.print(f"[green]✓ Synced {count} admins[/green]")
            return count

        except Exception as e:
            logger.error(f"Error syncing admins: {e}")
            self.stats['errors'].append(f"Admin sync: {str(e)}")
            return 0

    def sync_tags(self) -> int:
        """
        Sync all tags from Intercom

        Returns:
            Number of tags synced
        """
        try:
            console.print("[yellow]Syncing tags...[/yellow]")
            tags = self.intercom.list_tags()

            if tags:
                self.supabase.upsert_tags(tags)
                console.print(f"[green]✓ Synced {len(tags)} tags[/green]")
                return len(tags)

            return 0

        except Exception as e:
            logger.error(f"Error syncing tags: {e}")
            self.stats['errors'].append(f"Tag sync: {str(e)}")
            return 0

    def sync_conversation_users(self, conversation: Dict) -> int:
        """
        Sync users associated with a conversation

        Args:
            conversation: Conversation data

        Returns:
            Number of users synced
        """
        count = 0
        contacts = conversation.get('contacts', {}).get('contacts', [])

        for contact in contacts:
            # Handle both dict and string ID formats
            contact_id = contact if isinstance(contact, str) else contact.get('id')

            if contact_id and contact_id not in self.processed_users:
                try:
                    # Fetch full user details
                    user = self.intercom.get_user(contact_id)
                    self.supabase.upsert_user(user)
                    self.processed_users.add(contact_id)
                    count += 1
                except Exception as e:
                    logger.error(f"Error syncing user {contact_id}: {e}")
                    self.stats['errors'].append(f"User {contact_id}: {str(e)}")

        return count

    def sync_conversation(self, conversation: Dict) -> bool:
        """
        Sync a single conversation with all its data

        Args:
            conversation: Full conversation data

        Returns:
            True if successful, False otherwise
        """
        try:
            conv_id = conversation.get('id')

            # Sync associated users
            user_count = self.sync_conversation_users(conversation)
            self.stats['users_synced'] += user_count

            # Sync conversation
            self.supabase.upsert_conversation(conversation)

            # Sync messages (conversation parts)
            parts = conversation.get('conversation_parts', {}).get('conversation_parts', [])
            if parts:
                # Add the source message as the first part
                source = conversation.get('source')
                if source:
                    source_part = {
                        'id': f"{conv_id}_source",
                        'part_type': 'message',
                        'body': source.get('body'),
                        'author': source.get('author'),
                        'created_at': conversation.get('created_at'),
                        'attachments': source.get('attachments', [])
                    }
                    parts = [source_part] + parts

                messages = self.supabase.upsert_messages(conv_id, parts)
                self.stats['messages_synced'] += len(messages)

            # Link tags
            tags = conversation.get('tags', {}).get('tags', [])
            if tags:
                self.supabase.link_conversation_tags(conv_id, tags)

            self.stats['conversations_synced'] += 1
            return True

        except Exception as e:
            logger.error(f"Error syncing conversation {conversation.get('id')}: {e}")
            self.stats['errors'].append(f"Conversation {conversation.get('id')}: {str(e)}")
            return False

    def sync_conversations_batch(
        self,
        conversations: List[Dict],
        progress: Progress = None,
        task_id: int = None
    ) -> int:
        """
        Sync a batch of conversations in parallel

        Args:
            conversations: List of conversation data
            progress: Rich progress bar
            task_id: Progress task ID

        Returns:
            Number of conversations successfully synced
        """
        success_count = 0

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self.sync_conversation, conv): conv
                for conv in conversations
            }

            for future in as_completed(futures):
                if future.result():
                    success_count += 1

                if progress and task_id is not None:
                    progress.update(task_id, advance=1)

        return success_count

    def run_full_sync(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        batch_size: int = 50
    ):
        """
        Run a full sync of all conversations

        Args:
            start_date: Start date for sync
            end_date: End date for sync
            batch_size: Number of conversations to process in parallel
        """
        try:
            # Create sync log
            self.sync_log = self.supabase.create_sync_log(
                'full',
                {
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None,
                    'batch_size': batch_size
                }
            )

            console.print("[bold blue]Starting full Intercom sync...[/bold blue]")

            # Sync admins and tags first
            self.stats['admins_synced'] = self.sync_admins()
            self.stats['tags_synced'] = self.sync_tags()

            # Fetch and sync conversations
            console.print("[yellow]Fetching conversations...[/yellow]")

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
                TimeRemainingColumn(),
                console=console
            ) as progress:

                # Fetch all conversations using bulk export (more reliable, includes full details)
                sync_task = progress.add_task("[cyan]Syncing conversations...", total=None)

                # Process conversations as they come from the API
                batch = []
                total_processed = 0

                for full_conv in self.intercom.export_conversations_bulk(
                    start_date=start_date,
                    end_date=end_date,
                    include_closed=True
                ):
                    batch.append(full_conv)
                    total_processed += 1

                    if len(batch) >= batch_size:
                        self.sync_conversations_batch(batch, progress, sync_task)
                        batch = []

                        # Update progress display
                        progress.update(
                            sync_task,
                            description=f"[cyan]Synced {total_processed} conversations..."
                        )

                # Process remaining batch
                if batch:
                    self.sync_conversations_batch(batch, progress, sync_task)

                console.print(f"[green]Completed sync of {total_processed} conversations[/green]")

            # Update sync log
            self.supabase.update_sync_log(
                self.sync_log['sync_id'],
                status='completed' if not self.stats['errors'] else 'partial',
                conversations_synced=self.stats['conversations_synced'],
                messages_synced=self.stats['messages_synced'],
                users_synced=self.stats['users_synced'],
                admins_synced=self.stats['admins_synced'],
                tags_synced=self.stats['tags_synced'],
                errors=self.stats['errors'][:100] if self.stats['errors'] else None  # Limit error log size
            )

            # Print summary
            console.print("\n[bold green]Sync completed![/bold green]")
            console.print(f"Conversations synced: {self.stats['conversations_synced']}")
            console.print(f"Messages synced: {self.stats['messages_synced']}")
            console.print(f"Users synced: {self.stats['users_synced']}")
            console.print(f"Admins synced: {self.stats['admins_synced']}")
            console.print(f"Tags synced: {self.stats['tags_synced']}")

            if self.stats['errors']:
                console.print(f"[red]Errors encountered: {len(self.stats['errors'])}[/red]")
                for error in self.stats['errors'][:10]:  # Show first 10 errors
                    console.print(f"  - {error}")

        except Exception as e:
            logger.error(f"Fatal error during sync: {e}")
            if self.sync_log:
                self.supabase.update_sync_log(
                    self.sync_log['sync_id'],
                    status='failed',
                    errors=[str(e)]
                )
            raise

    def run_incremental_sync(self, hours_back: int = 24):
        """
        Run incremental sync for recent changes

        Args:
            hours_back: Number of hours to look back for changes
        """
        try:
            # Get last sync time or default to hours_back
            last_sync = self.supabase.get_last_sync_time()

            if not last_sync:
                last_sync = datetime.now(timezone.utc) - timedelta(hours=hours_back)

            console.print(f"[bold blue]Starting incremental sync from {last_sync}[/bold blue]")

            # Create sync log
            self.sync_log = self.supabase.create_sync_log(
                'incremental',
                {'since': last_sync.isoformat()}
            )

            # Sync admins and tags (always do full sync as they're small)
            self.stats['admins_synced'] = self.sync_admins()
            self.stats['tags_synced'] = self.sync_tags()

            # Fetch updated conversations
            console.print("[yellow]Fetching updated conversations...[/yellow]")

            conversations_to_sync = []
            for conv in self.intercom.list_all_conversations(updated_after=last_sync):
                conversations_to_sync.append(conv['id'])

            if not conversations_to_sync:
                console.print("[green]No conversations to sync[/green]")
                self.supabase.update_sync_log(
                    self.sync_log['sync_id'],
                    status='completed'
                )
                return

            console.print(f"[green]Found {len(conversations_to_sync)} updated conversations[/green]")

            # Sync conversations
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
                console=console
            ) as progress:

                sync_task = progress.add_task(
                    "[cyan]Syncing updated conversations...",
                    total=len(conversations_to_sync)
                )

                batch = []
                for conv_id in conversations_to_sync:
                    try:
                        full_conv = self.intercom.get_conversation_with_parts(conv_id)
                        batch.append(full_conv)

                        if len(batch) >= 20:
                            self.sync_conversations_batch(batch, progress, sync_task)
                            batch = []

                    except Exception as e:
                        logger.error(f"Error fetching conversation {conv_id}: {e}")
                        self.stats['errors'].append(f"Fetch {conv_id}: {str(e)}")
                        progress.update(sync_task, advance=1)

                # Process remaining batch
                if batch:
                    self.sync_conversations_batch(batch, progress, sync_task)

            # Update sync log
            self.supabase.update_sync_log(
                self.sync_log['sync_id'],
                status='completed' if not self.stats['errors'] else 'partial',
                conversations_synced=self.stats['conversations_synced'],
                messages_synced=self.stats['messages_synced'],
                users_synced=self.stats['users_synced'],
                admins_synced=self.stats['admins_synced'],
                tags_synced=self.stats['tags_synced'],
                errors=self.stats['errors'][:100] if self.stats['errors'] else None
            )

            # Print summary
            console.print("\n[bold green]Incremental sync completed![/bold green]")
            console.print(f"Conversations synced: {self.stats['conversations_synced']}")
            console.print(f"Messages synced: {self.stats['messages_synced']}")
            console.print(f"Users synced: {self.stats['users_synced']}")

            if self.stats['errors']:
                console.print(f"[red]Errors encountered: {len(self.stats['errors'])}[/red]")

        except Exception as e:
            logger.error(f"Fatal error during incremental sync: {e}")
            if self.sync_log:
                self.supabase.update_sync_log(
                    self.sync_log['sync_id'],
                    status='failed',
                    errors=[str(e)]
                )
            raise