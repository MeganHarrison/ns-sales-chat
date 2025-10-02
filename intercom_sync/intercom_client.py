"""
Intercom API Client for conversation data extraction
"""
import os
import time
import json
import base64
from typing import Dict, List, Optional, Any, Generator
from datetime import datetime, timezone
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from requests.exceptions import RequestException, HTTPError
import logging

logger = logging.getLogger(__name__)


class IntercomRateLimitError(Exception):
    """Raised when Intercom API rate limit is exceeded"""
    pass


class IntercomAPIError(Exception):
    """Raised when Intercom API returns an error"""
    pass


class IntercomClient:
    """Client for interacting with Intercom API"""

    BASE_URL = "https://api.intercom.io"
    MAX_RETRIES = 3
    RATE_LIMIT_PER_MINUTE = 500  # Intercom's rate limit

    def __init__(self, access_token: str = None):
        """
        Initialize Intercom client

        Args:
            access_token: Intercom API access token (Bearer token)
        """
        self.access_token = access_token or os.getenv('INTERCOM_ACCESS_TOKEN')
        if not self.access_token:
            # Try to decode from base64 if stored that way
            encoded_token = os.getenv('INTERCOM')
            if encoded_token:
                try:
                    self.access_token = base64.b64decode(encoded_token).decode('utf-8')
                except:
                    self.access_token = encoded_token

        if not self.access_token:
            raise ValueError("Intercom access token not provided")

        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Intercom-Version': '2.11'  # Latest stable version
        })

        self.request_count = 0
        self.last_request_time = time.time()

    def _check_rate_limit(self):
        """Check and enforce rate limiting"""
        current_time = time.time()
        time_diff = current_time - self.last_request_time

        # Reset counter if more than a minute has passed
        if time_diff > 60:
            self.request_count = 0
            self.last_request_time = current_time

        # If we've hit the rate limit, wait
        if self.request_count >= self.RATE_LIMIT_PER_MINUTE:
            sleep_time = 60 - time_diff
            if sleep_time > 0:
                logger.info(f"Rate limit reached. Sleeping for {sleep_time:.2f} seconds")
                time.sleep(sleep_time)
                self.request_count = 0
                self.last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        retry=retry_if_exception_type((RequestException, IntercomRateLimitError))
    )
    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        data: Dict = None
    ) -> Dict:
        """
        Make HTTP request to Intercom API with retry logic

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            params: Query parameters
            data: Request body data

        Returns:
            API response as dictionary
        """
        self._check_rate_limit()

        url = f"{self.BASE_URL}{endpoint}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                timeout=30
            )

            self.request_count += 1

            # Check for rate limiting
            if response.status_code == 429:
                retry_after = response.headers.get('X-RateLimit-Reset', 60)
                logger.warning(f"Rate limited. Retry after {retry_after} seconds")
                time.sleep(int(retry_after))
                raise IntercomRateLimitError("Rate limit exceeded")

            response.raise_for_status()

            return response.json() if response.text else {}

        except HTTPError as e:
            error_msg = f"Intercom API error: {e}"
            if e.response and e.response.text:
                error_msg += f" - {e.response.text}"
            logger.error(error_msg)
            raise IntercomAPIError(error_msg)

    def list_conversations(
        self,
        starting_after: Optional[str] = None,
        per_page: int = 20,
        **filters
    ) -> Dict:
        """
        List conversations with pagination

        Args:
            starting_after: Cursor for pagination
            per_page: Number of items per page (max 150)
            **filters: Additional filters (e.g., created_at_after, updated_at_after)

        Returns:
            API response with conversations list
        """
        params = {
            'per_page': min(per_page, 150),
            **filters
        }

        if starting_after:
            params['starting_after'] = starting_after

        return self._make_request('GET', '/conversations', params=params)

    def get_conversation(self, conversation_id: str) -> Dict:
        """
        Get detailed conversation data including all parts

        Args:
            conversation_id: Intercom conversation ID

        Returns:
            Full conversation data
        """
        return self._make_request('GET', f'/conversations/{conversation_id}')

    def search_conversations(self, query: Dict) -> Dict:
        """
        Search conversations using Intercom's search API

        Args:
            query: Search query in Intercom format

        Returns:
            Search results
        """
        data = {
            "query": query
        }
        return self._make_request('POST', '/conversations/search', data=data)

    def list_all_conversations(
        self,
        updated_after: Optional[datetime] = None,
        batch_size: int = 50
    ) -> Generator[Dict, None, None]:
        """
        Generator to iterate through all conversations

        Args:
            updated_after: Only get conversations updated after this time
            batch_size: Number of conversations per API call

        Yields:
            Individual conversation objects
        """
        starting_after = None
        filters = {}

        if updated_after:
            filters['order'] = 'updated_at'
            filters['sort'] = 'desc'
            # Convert to Unix timestamp
            filters['query'] = {
                "field": "updated_at",
                "operator": ">",
                "value": int(updated_after.timestamp())
            }

        while True:
            try:
                response = self.list_conversations(
                    starting_after=starting_after,
                    per_page=batch_size,
                    **filters
                )

                conversations = response.get('conversations', [])

                if not conversations:
                    break

                for conversation in conversations:
                    yield conversation

                # Check for next page
                pages = response.get('pages', {})
                if not pages.get('next'):
                    break

                starting_after = pages.get('next', {}).get('starting_after')
                if not starting_after:
                    break

            except Exception as e:
                logger.error(f"Error listing conversations: {e}")
                raise

    def get_user(self, user_id: str) -> Dict:
        """
        Get user/contact details

        Args:
            user_id: Intercom user/contact ID

        Returns:
            User data
        """
        return self._make_request('GET', f'/contacts/{user_id}')

    def get_admin(self, admin_id: str) -> Dict:
        """
        Get admin details

        Args:
            admin_id: Intercom admin ID

        Returns:
            Admin data
        """
        return self._make_request('GET', f'/admins/{admin_id}')

    def list_admins(self) -> List[Dict]:
        """
        List all admins

        Returns:
            List of admin objects
        """
        response = self._make_request('GET', '/admins')
        return response.get('admins', [])

    def list_tags(self) -> List[Dict]:
        """
        List all tags

        Returns:
            List of tag objects
        """
        response = self._make_request('GET', '/tags')
        return response.get('data', [])

    def get_conversation_with_parts(self, conversation_id: str) -> Dict:
        """
        Get conversation with all message parts

        Args:
            conversation_id: Intercom conversation ID

        Returns:
            Conversation with parts
        """
        conversation = self.get_conversation(conversation_id)

        # Intercom limits to 500 parts, check if we need to handle this
        parts = conversation.get('conversation_parts', {}).get('conversation_parts', [])
        total_count = conversation.get('conversation_parts', {}).get('total_count', 0)

        if total_count > 500:
            logger.warning(
                f"Conversation {conversation_id} has {total_count} parts, "
                f"but API limits to 500. Some messages may be missing."
            )

        return conversation

    def export_conversations_bulk(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_closed: bool = True
    ) -> Generator[Dict, None, None]:
        """
        Export conversations in bulk with all details

        Args:
            start_date: Start date for export
            end_date: End date for export
            include_closed: Include closed conversations

        Yields:
            Full conversation objects with parts
        """
        # Build search query
        query_conditions = []

        if start_date:
            query_conditions.append({
                "field": "created_at",
                "operator": ">",
                "value": int(start_date.timestamp())
            })

        if end_date:
            query_conditions.append({
                "field": "created_at",
                "operator": "<",
                "value": int(end_date.timestamp())
            })

        if not include_closed:
            query_conditions.append({
                "field": "open",
                "operator": "=",
                "value": True
            })

        # Use search API for more control
        if query_conditions:
            query = {
                "operator": "AND",
                "value": query_conditions
            } if len(query_conditions) > 1 else query_conditions[0]

            pagination = {"per_page": 150}
            starting_after = None

            while True:
                if starting_after:
                    pagination["starting_after"] = starting_after

                search_data = {
                    "query": query,
                    "pagination": pagination
                }

                response = self._make_request('POST', '/conversations/search', data=search_data)
                conversations = response.get('conversations', [])

                if not conversations:
                    break

                for conv in conversations:
                    # Fetch full conversation details
                    full_conv = self.get_conversation_with_parts(conv['id'])
                    yield full_conv

                # Check for next page
                pages = response.get('pages', {})
                if not pages.get('next'):
                    break

                starting_after = pages.get('next', {}).get('starting_after')
                if not starting_after:
                    break
        else:
            # No filters, get all conversations
            for conv in self.list_all_conversations():
                full_conv = self.get_conversation_with_parts(conv['id'])
                yield full_conv