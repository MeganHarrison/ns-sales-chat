"""
Supabase database manager for Intercom data
"""
import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)


class SupabaseManager:
    """Manager for Supabase database operations"""

    def __init__(self, url: str = None, key: str = None):
        """
        Initialize Supabase client

        Args:
            url: Supabase project URL
            key: Supabase service role key
        """
        self.url = url or os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.key = key or os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not self.url or not self.key:
            raise ValueError("Supabase URL and key are required")

        self.client: Client = create_client(self.url, self.key)

    def upsert_admin(self, admin_data: Dict) -> Dict:
        """
        Insert or update admin data

        Args:
            admin_data: Admin data from Intercom

        Returns:
            Inserted/updated admin record
        """
        admin_record = {
            'admin_id': admin_data.get('id'),
            'type': admin_data.get('type'),
            'name': admin_data.get('name'),
            'email': admin_data.get('email'),
            'job_title': admin_data.get('job_title'),
            'away_mode_enabled': admin_data.get('away_mode_enabled', False),
            'away_mode_reassign': admin_data.get('away_mode_reassign', False),
            'has_inbox_seat': admin_data.get('has_inbox_seat', True),
            'team_ids': admin_data.get('team_ids', []),
            'avatar_url': admin_data.get('avatar', {}).get('image_url') if admin_data.get('avatar') else None,
            'synced_at': datetime.now(timezone.utc).isoformat()
        }

        try:
            result = self.client.table('intercom_admins').upsert(
                admin_record,
                on_conflict='admin_id'
            ).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error upserting admin {admin_data.get('id')}: {e}")
            raise

    def upsert_user(self, user_data: Dict) -> Dict:
        """
        Insert or update user/contact data

        Args:
            user_data: User data from Intercom

        Returns:
            Inserted/updated user record
        """
        # Extract location data
        location = user_data.get('location', {}) or {}

        user_record = {
            'user_id': user_data.get('id'),
            'type': user_data.get('type', 'contact'),
            'external_id': user_data.get('external_id'),
            'email': user_data.get('email'),
            'phone': user_data.get('phone'),
            'name': user_data.get('name'),
            'avatar_url': user_data.get('avatar', {}).get('image_url') if user_data.get('avatar') else None,
            'pseudonym': user_data.get('pseudonym'),
            'location_country': location.get('country'),
            'location_region': location.get('region'),
            'location_city': location.get('city'),
            'user_agent_data': user_data.get('user_agent_data'),
            'custom_attributes': user_data.get('custom_attributes'),
            'segments': [seg.get('id') for seg in user_data.get('segments', {}).get('segments', [])],
            'tags': [tag.get('id') for tag in user_data.get('tags', {}).get('tags', [])],
            'companies': user_data.get('companies', {}).get('companies', []),
            'social_profiles': user_data.get('social_profiles', {}).get('social_profiles', []),
            'unsubscribed_from_emails': user_data.get('unsubscribed_from_emails', False),
            'marked_email_as_spam': user_data.get('marked_email_as_spam', False),
            'has_hard_bounced': user_data.get('has_hard_bounced', False),
            'browser': user_data.get('browser'),
            'browser_version': user_data.get('browser_version'),
            'browser_language': user_data.get('browser_language'),
            'os': user_data.get('os'),
            'synced_at': datetime.now(timezone.utc).isoformat()
        }

        # Convert timestamps
        timestamp_fields = [
            'created_at', 'updated_at', 'signed_up_at', 'last_seen_at',
            'last_contacted_at', 'last_email_opened_at', 'last_email_clicked_at'
        ]

        for field in timestamp_fields:
            if user_data.get(field):
                user_record[field] = datetime.fromtimestamp(
                    user_data[field],
                    tz=timezone.utc
                ).isoformat()

        try:
            result = self.client.table('intercom_users').upsert(
                user_record,
                on_conflict='user_id'
            ).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error upserting user {user_data.get('id')}: {e}")
            raise

    def upsert_conversation(self, conversation_data: Dict) -> Dict:
        """
        Insert or update conversation data

        Args:
            conversation_data: Conversation data from Intercom

        Returns:
            Inserted/updated conversation record
        """
        source = conversation_data.get('source', {}) or {}
        statistics = conversation_data.get('statistics', {}) or {}
        sla_applied = conversation_data.get('sla_applied', {}) or {}
        conversation_rating = conversation_data.get('conversation_rating', {}) or {}

        conversation_record = {
            'conversation_id': conversation_data.get('id'),
            'type': conversation_data.get('type'),
            'source_type': source.get('type'),
            'source_id': source.get('id'),
            'source_delivered_as': source.get('delivered_as'),
            'source_subject': source.get('subject'),
            'source_body': source.get('body'),
            'source_author_type': source.get('author', {}).get('type') if source.get('author') else None,
            'source_author_id': source.get('author', {}).get('id') if source.get('author') else None,
            'source_author_name': source.get('author', {}).get('name') if source.get('author') else None,
            'source_author_email': source.get('author', {}).get('email') if source.get('author') else None,
            'source_url': source.get('url'),
            'source_attachments': source.get('attachments', []),
            'contacts': [c.get('id') for c in conversation_data.get('contacts', {}).get('contacts', [])],
            'teammates': [t.get('id') for t in conversation_data.get('teammates', {}).get('teammates', [])],
            'admin_assignee_id': conversation_data.get('admin_assignee_id'),
            'team_assignee_id': conversation_data.get('team_assignee_id'),
            'open': conversation_data.get('open', True),
            'state': conversation_data.get('state', 'open'),
            'read': conversation_data.get('read', False),
            'priority': conversation_data.get('priority'),
            'sla_applied': sla_applied if sla_applied else None,
            'statistics': statistics if statistics else None,
            'conversation_rating': conversation_rating if conversation_rating else None,
            'tags': [tag.get('id') for tag in conversation_data.get('tags', {}).get('tags', [])],
            'custom_attributes': conversation_data.get('custom_attributes'),
            'topics': conversation_data.get('topics'),
            'ticket_id': conversation_data.get('ticket', {}).get('id') if conversation_data.get('ticket') else None,
            'linked_objects': conversation_data.get('linked_objects'),
            'ai_agent_participated': conversation_data.get('ai_agent_participated', False),
            'ai_agent': conversation_data.get('ai_agent'),
            'synced_at': datetime.now(timezone.utc).isoformat()
        }

        # Convert timestamps
        timestamp_fields = [
            'created_at', 'updated_at', 'waiting_since', 'snoozed_until',
            'first_contact_reply_at'
        ]

        for field in timestamp_fields:
            if conversation_data.get(field):
                conversation_record[field] = datetime.fromtimestamp(
                    conversation_data[field],
                    tz=timezone.utc
                ).isoformat()

        # Handle first contact reply type
        if conversation_data.get('first_contact_reply'):
            conversation_record['first_contact_reply_type'] = conversation_data['first_contact_reply'].get('type')

        try:
            result = self.client.table('intercom_conversations').upsert(
                conversation_record,
                on_conflict='conversation_id'
            ).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error upserting conversation {conversation_data.get('id')}: {e}")
            raise

    def upsert_messages(self, conversation_id: str, parts: List[Dict]) -> List[Dict]:
        """
        Insert or update conversation parts (messages)

        Args:
            conversation_id: Conversation ID
            parts: List of conversation parts

        Returns:
            List of inserted/updated message records
        """
        messages = []

        for index, part in enumerate(parts):
            author = part.get('author', {}) or {}

            message_record = {
                'message_id': part.get('id'),
                'conversation_id': conversation_id,
                'part_type': part.get('part_type'),
                'body': part.get('body'),
                'author_id': author.get('id'),
                'author_type': author.get('type'),
                'author_name': author.get('name'),
                'author_email': author.get('email'),
                'attachments': part.get('attachments', []),
                'external_id': part.get('external_id'),
                'redacted': part.get('redacted', False),
                'message_index': index,
                'assigned_to_id': part.get('assigned_to', {}).get('id') if part.get('assigned_to') else None,
                'assigned_to_type': part.get('assigned_to', {}).get('type') if part.get('assigned_to') else None,
                'synced_at': datetime.now(timezone.utc).isoformat()
            }

            # Convert timestamps
            timestamp_fields = ['created_at', 'updated_at', 'notified_at']
            for field in timestamp_fields:
                if part.get(field):
                    message_record[field] = datetime.fromtimestamp(
                        part[field],
                        tz=timezone.utc
                    ).isoformat()

            messages.append(message_record)

        if messages:
            try:
                result = self.client.table('intercom_messages').upsert(
                    messages,
                    on_conflict='message_id'
                ).execute()
                return result.data
            except Exception as e:
                logger.error(f"Error upserting messages for conversation {conversation_id}: {e}")
                raise

        return []

    def upsert_tags(self, tags: List[Dict]) -> List[Dict]:
        """
        Insert or update tags

        Args:
            tags: List of tag data

        Returns:
            List of inserted/updated tag records
        """
        tag_records = []

        for tag in tags:
            tag_record = {
                'tag_id': tag.get('id'),
                'name': tag.get('name')
            }
            tag_records.append(tag_record)

        if tag_records:
            try:
                result = self.client.table('intercom_tags').upsert(
                    tag_records,
                    on_conflict='tag_id'
                ).execute()
                return result.data
            except Exception as e:
                logger.error(f"Error upserting tags: {e}")
                raise

        return []

    def link_conversation_tags(self, conversation_id: str, tags: List[Dict]):
        """
        Link tags to a conversation

        Args:
            conversation_id: Conversation ID
            tags: List of tag data with applied info
        """
        links = []

        for tag in tags:
            link = {
                'conversation_id': conversation_id,
                'tag_id': tag.get('id'),
                'applied_by_id': tag.get('applied_by', {}).get('id') if tag.get('applied_by') else None,
                'applied_by_type': tag.get('applied_by', {}).get('type') if tag.get('applied_by') else None
            }

            if tag.get('applied_at'):
                link['applied_at'] = datetime.fromtimestamp(
                    tag['applied_at'],
                    tz=timezone.utc
                ).isoformat()

            links.append(link)

        if links:
            try:
                # Delete existing links first to avoid duplicates
                self.client.table('intercom_conversation_tags').delete().eq(
                    'conversation_id', conversation_id
                ).execute()

                # Insert new links
                self.client.table('intercom_conversation_tags').insert(links).execute()
            except Exception as e:
                logger.error(f"Error linking tags for conversation {conversation_id}: {e}")
                raise

    def create_sync_log(self, sync_type: str, metadata: Dict = None) -> Dict:
        """
        Create a new sync log entry

        Args:
            sync_type: Type of sync (full, incremental, webhook, manual)
            metadata: Additional sync metadata

        Returns:
            Created sync log record
        """
        sync_log = {
            'sync_type': sync_type,
            'status': 'running',
            'sync_metadata': metadata or {}
        }

        try:
            result = self.client.table('intercom_sync_logs').insert(sync_log).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating sync log: {e}")
            raise

    def update_sync_log(
        self,
        sync_id: str,
        status: str = None,
        **updates
    ) -> Dict:
        """
        Update sync log entry

        Args:
            sync_id: Sync log ID
            status: Sync status
            **updates: Additional fields to update

        Returns:
            Updated sync log record
        """
        update_data = {}

        if status:
            update_data['status'] = status

        if status in ['completed', 'failed', 'partial']:
            update_data['completed_at'] = datetime.now(timezone.utc).isoformat()

        update_data.update(updates)

        try:
            result = self.client.table('intercom_sync_logs').update(
                update_data
            ).eq('sync_id', sync_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating sync log {sync_id}: {e}")
            raise

    def get_last_sync_time(self) -> Optional[datetime]:
        """
        Get the timestamp of the last successful sync

        Returns:
            Last sync timestamp or None
        """
        try:
            result = self.client.table('intercom_sync_logs').select(
                'completed_at'
            ).eq('status', 'completed').order(
                'completed_at', desc=True
            ).limit(1).execute()

            if result.data:
                return datetime.fromisoformat(result.data[0]['completed_at'])
            return None
        except Exception as e:
            logger.error(f"Error getting last sync time: {e}")
            return None

    def log_webhook_event(self, event_type: str, topic: str, data: Dict) -> Dict:
        """
        Log a webhook event

        Args:
            event_type: Event type
            topic: Event topic
            data: Event data

        Returns:
            Created webhook event record
        """
        event = {
            'event_type': event_type,
            'topic': topic,
            'data': data,
            'processed': False
        }

        try:
            result = self.client.table('intercom_webhook_events').insert(event).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error logging webhook event: {e}")
            raise

    def mark_webhook_processed(self, event_id: str, error: str = None):
        """
        Mark a webhook event as processed

        Args:
            event_id: Event ID
            error: Error message if processing failed
        """
        update_data = {
            'processed': True,
            'processed_at': datetime.now(timezone.utc).isoformat()
        }

        if error:
            update_data['error'] = error

        try:
            self.client.table('intercom_webhook_events').update(
                update_data
            ).eq('event_id', event_id).execute()
        except Exception as e:
            logger.error(f"Error marking webhook {event_id} as processed: {e}")