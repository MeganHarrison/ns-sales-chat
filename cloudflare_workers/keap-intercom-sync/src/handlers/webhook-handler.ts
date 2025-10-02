/**
 * Keap Webhook Handler
 * Processes incoming webhooks from Keap for contact events
 */

import type { Env, KeapWebhookEvent } from '../types';
import { KeapClient } from '../keap-client';
import { IntercomClient } from '../intercom-client';
import { syncContactToIntercom } from './contact-sync';

/**
 * Verify Keap webhook signature
 */
async function verifyWebhookSignature(
  request: Request,
  secret: string
): Promise<boolean> {
  const signature = request.headers.get('X-Hook-Secret');

  if (!signature) {
    return false;
  }

  // Keap uses HMAC-SHA256 for webhook signatures
  // The secret is sent in the header for initial verification
  return signature === secret;
}

/**
 * Handle Keap webhook events
 */
export async function handleKeapWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(
      request,
      env.KEAP_WEBHOOK_SECRET
    );

    if (!isValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse webhook payload
    const payload: KeapWebhookEvent = await request.json();

    console.log('Received Keap webhook:', payload);

    // Extract contact ID from the event
    const contactId = payload.object_keys?.contactId;

    if (!contactId) {
      console.warn('No contact ID in webhook payload');
      return new Response('No contact ID found', { status: 400 });
    }

    // Initialize clients
    const keapClient = new KeapClient(env.KEAP_API_KEY);
    const intercomClient = new IntercomClient(env.INTERCOM_ACCESS_TOKEN);

    // Process the contact sync
    const result = await syncContactToIntercom(
      contactId,
      keapClient,
      intercomClient,
      env
    );

    return new Response(
      JSON.stringify({
        success: true,
        action: result.action,
        intercomContactId: result.intercomContact?.id,
        keapContactId: contactId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error handling Keap webhook:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle webhook verification challenge (initial setup)
 */
export async function handleWebhookVerification(
  request: Request
): Promise<Response> {
  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge');

  if (challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Invalid verification request', { status: 400 });
}
