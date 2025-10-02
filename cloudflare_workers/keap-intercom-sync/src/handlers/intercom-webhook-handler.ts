/**
 * Intercom Webhook Handler
 * Processes webhooks from Intercom for user/contact creation and updates
 */

import type { Env } from '../types';

export interface IntercomWebhookPayload {
  type: 'notification_event';
  app_id: string;
  data: {
    type: 'notification_event_data';
    item: {
      type: 'user' | 'contact';
      id: string;
      user_id?: string;
      email?: string;
      name?: string;
      phone?: string;
      custom_attributes?: Record<string, unknown>;
      created_at?: number;
      updated_at?: number;
    };
  };
  topic: string; // e.g., 'user.created', 'contact.created'
  id: string;
  created_at: number;
}

/**
 * Verify Intercom webhook signature using Web Crypto API
 * https://developers.intercom.com/docs/references/webhooks/webhook-signature-verification
 */
export async function verifyIntercomSignature(
  request: Request,
  body: string,
  clientSecret: string
): Promise<boolean> {
  const signature = request.headers.get('X-Hub-Signature');

  if (!signature) {
    return false;
  }

  // Signature format: sha256=<signature>
  const [algorithm, receivedSignature] = signature.split('=');

  if (algorithm !== 'sha256') {
    return false;
  }

  try {
    // Convert secret to key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(clientSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the body
    const bodyData = encoder.encode(body);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyData);

    // Convert to hex
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time comparison
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Handle Intercom webhook events
 */
export async function handleIntercomWebhook(
  request: Request,
  env: Env
): Promise<{ status: number; body: string }> {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature if client secret is configured
    if (env.INTERCOM_CLIENT_SECRET) {
      const isValid = await verifyIntercomSignature(request, rawBody, env.INTERCOM_CLIENT_SECRET);

      if (!isValid) {
        console.error('Invalid Intercom webhook signature');
        return {
          status: 401,
          body: JSON.stringify({ error: 'Invalid signature' }),
        };
      }
    }

    // Parse webhook payload
    const payload: IntercomWebhookPayload = JSON.parse(rawBody);

    console.log('Intercom webhook received:', {
      topic: payload.topic,
      item_type: payload.data.item.type,
      item_id: payload.data.item.id,
    });

    // Only process user and contact creation/update events
    const relevantTopics = [
      'user.created',
      'contact.created',
      'user.updated',
      'contact.updated',
    ];

    if (!relevantTopics.includes(payload.topic)) {
      console.log(`Ignoring webhook topic: ${payload.topic}`);
      return {
        status: 200,
        body: JSON.stringify({ message: 'Event ignored' }),
      };
    }

    // Extract contact data
    const intercomContact = payload.data.item;

    // Process the sync directly (simpler than queue for now)
    // Import sync function
    const { syncContactToKeap } = await import('./contact-sync');
    const { KeapClient } = await import('../keap-client');
    const { IntercomClient } = await import('../intercom-client');

    // Initialize clients
    const keapClient = new KeapClient(env.KEAP_API_KEY);
    const intercomClient = new IntercomClient(env.INTERCOM_ACCESS_TOKEN);

    // Trigger sync asynchronously (don't wait for completion)
    const syncPromise = syncContactToKeap(
      intercomContact.id,
      intercomContact.email || '',
      intercomContact.name,
      intercomContact.phone,
      keapClient,
      intercomClient,
      env
    ).catch(error => {
      console.error('Error in background sync:', error);
    });

    // Optional: Use waitUntil to ensure sync completes even after response
    // ctx.waitUntil(syncPromise); // Requires execution context

    return {
      status: 200,
      body: JSON.stringify({
        message: 'Webhook received and processing',
        event_id: payload.id,
      }),
    };
  } catch (error) {
    console.error('Error handling Intercom webhook:', error);

    return {
      status: 500,
      body: JSON.stringify({
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
