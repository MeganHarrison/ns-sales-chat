/**
 * Intercom-Keap Contact Sync Worker
 * PRIMARY: Sync Intercom users → Keap when created in Intercom
 * SECONDARY: Manual sync from Keap → Intercom (legacy support)
 */

import type { Env } from './types';
import {
  handleKeapWebhook,
  handleWebhookVerification,
} from './handlers/webhook-handler';
import { handleIntercomWebhook } from './handlers/intercom-webhook-handler';
import { KeapClient } from './keap-client';
import { IntercomClient } from './intercom-client';
import { syncContactToIntercom, syncContactToKeap, batchSyncContacts } from './handlers/contact-sync';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route: Intercom webhook endpoint (PRIMARY)
      if (url.pathname === '/webhook/intercom' && request.method === 'POST') {
        const response = await handleIntercomWebhook(request, env);
        return new Response(response.body, {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route: Keap webhook endpoint (LEGACY - for manual sync)
      if (url.pathname === '/webhook/keap' && request.method === 'POST') {
        const response = await handleKeapWebhook(request, env);
        return new Response(response.body, {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route: Webhook verification (for initial setup)
      if (url.pathname === '/webhook/keap' && request.method === 'GET') {
        return handleWebhookVerification(request);
      }

      // Route: Manual sync single contact
      if (url.pathname === '/sync/contact' && request.method === 'POST') {
        const { keap_contact_id } = await request.json<{
          keap_contact_id: number;
        }>();

        if (!keap_contact_id) {
          return new Response(
            JSON.stringify({ error: 'keap_contact_id required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const keapClient = new KeapClient(env.KEAP_API_KEY);
        const intercomClient = new IntercomClient(env.INTERCOM_ACCESS_TOKEN);

        const result = await syncContactToIntercom(
          keap_contact_id,
          keapClient,
          intercomClient,
          env
        );

        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route: Batch sync contacts
      if (url.pathname === '/sync/batch' && request.method === 'POST') {
        const { keap_contact_ids } = await request.json<{
          keap_contact_ids: number[];
        }>();

        if (!Array.isArray(keap_contact_ids) || keap_contact_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'keap_contact_ids array required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const keapClient = new KeapClient(env.KEAP_API_KEY);
        const intercomClient = new IntercomClient(env.INTERCOM_ACCESS_TOKEN);

        const results = await batchSyncContacts(
          keap_contact_ids,
          keapClient,
          intercomClient,
          env
        );

        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route: Health check
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // 404 for unknown routes
      return new Response(
        JSON.stringify({
          error: 'Not found',
          availableEndpoints: [
            'POST /webhook/intercom - Intercom webhook handler (PRIMARY - syncs Intercom → Keap)',
            'POST /webhook/keap - Keap webhook handler (LEGACY - syncs Keap → Intercom)',
            'POST /sync/contact - Manual single contact sync (Keap → Intercom)',
            'POST /sync/batch - Batch contact sync (Keap → Intercom)',
            'GET /health - Health check',
          ],
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Worker error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
