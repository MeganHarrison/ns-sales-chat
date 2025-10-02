"""
Webhook handler for real-time Intercom updates
"""
import os
import hmac
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Optional
from flask import Flask, request, jsonify
import logging

from intercom_client import IntercomClient
from supabase_manager import SupabaseManager
from sync_orchestrator import IntercomSyncOrchestrator

app = Flask(__name__)
logger = logging.getLogger(__name__)

# Initialize clients
intercom_client = IntercomClient()
supabase = SupabaseManager()
orchestrator = IntercomSyncOrchestrator()

# Webhook secret for signature verification
WEBHOOK_SECRET = os.getenv('INTERCOM_WEBHOOK_SECRET', '')


def verify_webhook_signature(request_body: bytes, signature: str) -> bool:
    """
    Verify Intercom webhook signature

    Args:
        request_body: Raw request body
        signature: X-Hub-Signature header value

    Returns:
        True if signature is valid
    """
    if not WEBHOOK_SECRET:
        logger.warning("Webhook secret not configured, skipping verification")
        return True

    expected_signature = 'sha1=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        request_body,
        hashlib.sha1
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)


def process_conversation_event(event_data: Dict):
    """
    Process conversation-related webhook event

    Args:
        event_data: Webhook event data
    """
    try:
        conversation_id = event_data.get('item', {}).get('id')
        if not conversation_id:
            logger.error("No conversation ID in webhook data")
            return

        # Fetch full conversation data
        conversation = intercom_client.get_conversation_with_parts(conversation_id)

        # Sync to Supabase
        orchestrator.sync_conversation(conversation)

        logger.info(f"Successfully synced conversation {conversation_id} from webhook")

    except Exception as e:
        logger.error(f"Error processing conversation webhook: {e}")
        raise


def process_user_event(event_data: Dict):
    """
    Process user-related webhook event

    Args:
        event_data: Webhook event data
    """
    try:
        user_id = event_data.get('item', {}).get('id')
        if not user_id:
            logger.error("No user ID in webhook data")
            return

        # Fetch full user data
        user = intercom_client.get_user(user_id)

        # Sync to Supabase
        supabase.upsert_user(user)

        logger.info(f"Successfully synced user {user_id} from webhook")

    except Exception as e:
        logger.error(f"Error processing user webhook: {e}")
        raise


@app.route('/webhook/intercom', methods=['POST'])
def handle_intercom_webhook():
    """Handle incoming Intercom webhooks"""
    try:
        # Verify signature
        signature = request.headers.get('X-Hub-Signature', '')
        if not verify_webhook_signature(request.data, signature):
            logger.warning("Invalid webhook signature")
            return jsonify({'error': 'Invalid signature'}), 401

        # Parse webhook data
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        topic = data.get('topic', '')
        event_type = data.get('type', '')

        # Log webhook event
        supabase.log_webhook_event(event_type, topic, data)

        # Process based on topic
        if topic.startswith('conversation.'):
            process_conversation_event(data)

        elif topic.startswith('contact.') or topic.startswith('user.'):
            process_user_event(data)

        elif topic == 'conversation_part.create':
            # New message in conversation
            process_conversation_event(data)

        elif topic == 'conversation.admin.assigned':
            # Admin assignment change
            process_conversation_event(data)

        elif topic == 'conversation.admin.noted':
            # Internal note added
            process_conversation_event(data)

        elif topic == 'conversation.user.replied':
            # User replied to conversation
            process_conversation_event(data)

        else:
            logger.info(f"Unhandled webhook topic: {topic}")

        return jsonify({'status': 'success'}), 200

    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Run Flask app
    port = int(os.getenv('WEBHOOK_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)