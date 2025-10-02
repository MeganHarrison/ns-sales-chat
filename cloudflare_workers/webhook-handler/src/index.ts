/**
 * Keap Webhook Handler Worker
 * 
 * Handles incoming webhooks from Keap CRM with HMAC signature verification
 * and forwards them to the appropriate Durable Object for processing.
 */

import { verifyKeapWebhook } from './hmac-verify';
import { 
  Env, 
  KeapWebhookEvent, 
  ProcessedWebhookEvent, 
  WebhookProcessingResult,
  KeapEventType,
  WebhookStatus
} from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Hook-Signature',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Hook-Signature',
    };

    try {
      // Health check endpoint
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            sync_coordinator: !!env.SYNC_COORDINATOR,
            webhook_secret_configured: !!env.KEAP_WEBHOOK_SECRET
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Main webhook endpoint
      if (path === '/webhook' || path === '/') {
        return await handleWebhook(request, env, ctx);
      }

      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Webhook handler error:', error);
      return new Response(`Internal Server Error: ${error.message}`, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle incoming Keap webhook
 */
async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Only accept POST requests for webhooks
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify webhook signature before processing
    const isValidSignature = await verifyKeapWebhook(request, env.KEAP_WEBHOOK_SECRET);
    if (!isValidSignature) {
      console.warn('Invalid webhook signature received');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse webhook data
    const webhookData: KeapWebhookEvent = await request.json();
    console.log('Received webhook:', JSON.stringify(webhookData, null, 2));

    // Validate webhook data structure
    if (!isValidWebhookData(webhookData)) {
      console.error('Invalid webhook data structure:', webhookData);
      return new Response('Invalid webhook data', { status: 400 });
    }

    // Process webhook based on event type
    const result = await processWebhookEvent(webhookData, env, ctx);
    
    if (result.success) {
      console.log('Webhook processed successfully:', result.message);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('Webhook processing failed:', result.error);
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Validate webhook data structure
 */
function isValidWebhookData(data: any): data is KeapWebhookEvent {
  return (
    data &&
    typeof data.eventKey === 'string' &&
    typeof data.eventType === 'string' &&
    Array.isArray(data.objectKeys) &&
    typeof data.objectType === 'string' &&
    typeof data.apiUrl === 'string'
  );
}

/**
 * Process webhook event based on type
 */
async function processWebhookEvent(
  webhookData: KeapWebhookEvent, 
  env: Env, 
  ctx: ExecutionContext
): Promise<WebhookProcessingResult> {
  try {
    // Check if this is a supported event type
    if (!isSupportedEventType(webhookData.eventType)) {
      return {
        success: true,
        message: `Event type ${webhookData.eventType} is not supported, skipping`,
        eventKey: webhookData.eventKey
      };
    }

    // Extract Keap account ID from the webhook data or API URL
    const keapAccountId = extractKeapAccountId(webhookData);
    if (!keapAccountId) {
      return {
        success: false,
        message: 'Could not determine Keap account ID from webhook data',
        error: 'Missing account ID'
      };
    }

    // Create processed webhook event
    const processedEvent: ProcessedWebhookEvent = {
      ...webhookData,
      receivedAt: Date.now(),
      keapAccountId
    };

    // Forward to sync coordinator
    const response = await env.SYNC_COORDINATOR.fetch(
      `https://sync-coordinator.workers.dev/keap/${keapAccountId}/webhook/process`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedEvent)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync coordinator error: ${response.status} ${errorText}`);
    }

    const coordinatorResult = await response.json();
    
    return {
      success: true,
      message: `Webhook event ${webhookData.eventType} processed successfully`,
      eventKey: webhookData.eventKey
    };

  } catch (error) {
    console.error('Error processing webhook event:', error);
    return {
      success: false,
      message: 'Failed to process webhook event',
      error: error.message,
      eventKey: webhookData.eventKey
    };
  }
}

/**
 * Check if event type is supported
 */
function isSupportedEventType(eventType: string): boolean {
  return Object.values(KeapEventType).includes(eventType as KeapEventType);
}

/**
 * Extract Keap account ID from webhook data
 * This is a placeholder - in reality, you might need to parse the API URL
 * or maintain a mapping of webhook endpoints to account IDs
 */
function extractKeapAccountId(webhookData: KeapWebhookEvent): string | null {
  try {
    // Try to extract from API URL
    const url = new URL(webhookData.apiUrl);
    const pathSegments = url.pathname.split('/');
    
    // Look for common patterns in Keap API URLs
    // This might need adjustment based on actual Keap API URL structure
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      if (segment === 'v1' && i + 1 < pathSegments.length) {
        // Assumption: account ID might be after v1 in the path
        const potentialAccountId = pathSegments[i + 1];
        if (potentialAccountId && potentialAccountId !== 'contacts' && potentialAccountId !== 'orders') {
          return potentialAccountId;
        }
      }
    }
    
    // Fallback: use a default account ID for single-tenant deployments
    // In multi-tenant scenarios, you'd need a more sophisticated mapping
    return 'default-account';
    
  } catch (error) {
    console.error('Error extracting account ID:', error);
    return 'default-account';
  }
}
