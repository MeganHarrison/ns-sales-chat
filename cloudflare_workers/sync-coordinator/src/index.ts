/**
 * Sync Coordinator Worker
 * 
 * Main entry point for the Keap-Supabase sync coordination service.
 * Exports the SyncCoordinator Durable Object and provides HTTP endpoints
 * for OAuth management and sync coordination.
 */

import { SyncCoordinator, Env } from './sync-coordinator';

export { SyncCoordinator };

/**
 * Main worker fetch handler
 * Routes requests to appropriate endpoints or Durable Object instances
 */
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
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
      // Health check endpoint
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            durable_objects: true,
            kv_cache: !!env.SYNC_CACHE,
            hyperdrive: !!env.HYPERDRIVE
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Route requests to Durable Object based on Keap account ID
      if (path.startsWith('/keap/')) {
        const segments = path.split('/');
        if (segments.length < 3) {
          return new Response('Invalid path format. Expected: /keap/{accountId}/...', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const keapAccountId = segments[2];
        const remainingPath = '/' + segments.slice(3).join('/');

        // Get Durable Object instance for this Keap account
        const durableObjectId = env.SYNC_COORDINATOR.idFromName(`keap-${keapAccountId}`);
        const coordinator = env.SYNC_COORDINATOR.get(durableObjectId);

        // Forward request to Durable Object with modified path
        const modifiedUrl = new URL(request.url);
        modifiedUrl.pathname = remainingPath;

        const modifiedRequest = new Request(modifiedUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        const response = await coordinator.fetch(modifiedRequest);
        
        // Add CORS headers to Durable Object response
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newHeaders.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      // Global endpoints that don't require a specific Keap account
      switch (path) {
        case '/sync/status':
          return await handleGlobalSyncStatus(env);
        
        case '/accounts/list':
          return await handleListAccounts(env);
        
        default:
          return new Response('Not Found', { 
            status: 404, 
            headers: corsHeaders 
          });
      }

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Internal Server Error: ${error.message}`, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },

  /**
   * Scheduled event handler for automated sync operations
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Running scheduled sync operations...');

    try {
      // Get list of active Keap accounts from KV
      const accountsData = await env.SYNC_CACHE.list({ prefix: 'sync_config:' });
      
      for (const key of accountsData.keys) {
        const keapAccountId = key.name.replace('sync_config:', '');
        
        // Get Durable Object for this account
        const durableObjectId = env.SYNC_COORDINATOR.idFromName(`keap-${keapAccountId}`);
        const coordinator = env.SYNC_COORDINATOR.get(durableObjectId);
        
        // Trigger scheduled sync
        await coordinator.fetch(new Request('https://sync-coordinator.workers.dev/sync/trigger', {
          method: 'POST',
          body: JSON.stringify({ keapAccountId, syncType: 'all' }),
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      console.log(`Scheduled sync triggered for ${accountsData.keys.length} accounts`);
    } catch (error) {
      console.error('Scheduled sync error:', error);
    }
  }
} satisfies ExportedHandler<Env>;

/**
 * Handle global sync status request
 */
async function handleGlobalSyncStatus(env: Env): Promise<Response> {
  try {
    // Get sync status from KV cache
    const statusData = await env.SYNC_CACHE.get('global_sync_status');
    const status = statusData ? JSON.parse(statusData) : { status: 'unknown' };
    
    return Response.json(status);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handle list accounts request
 */
async function handleListAccounts(env: Env): Promise<Response> {
  try {
    // Get all sync configurations from KV
    const accountsData = await env.SYNC_CACHE.list({ prefix: 'sync_config:' });
    
    const accounts = await Promise.all(
      accountsData.keys.map(async (key) => {
        const keapAccountId = key.name.replace('sync_config:', '');
        const config = await env.SYNC_CACHE.get(key.name);
        
        return {
          keapAccountId,
          config: config ? JSON.parse(config) : null,
          lastModified: key.metadata?.lastModified || null
        };
      })
    );
    
    return Response.json({ accounts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Type definitions for TypeScript
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  interface ScheduledEvent {
    cron: string;
    scheduledTime: number;
  }
}
