/**
 * Sync Worker
 * 
 * Handles scheduled and on-demand sync operations between Keap and Supabase.
 * Uses Hyperdrive for optimized database connections and rate-limited Keap API client.
 */

import { RateLimitedKeapClient } from './keap-client';
import { HyperdriveSupabaseClient } from './supabase-client';

export interface Env {
  SYNC_COORDINATOR: Fetcher;
  HYPERDRIVE: Hyperdrive;
  SYNC_CACHE: KVNamespace;
  
  // Supabase Configuration
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Environment
  ENVIRONMENT: string;
}

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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
      // Health check endpoint
      if (path === '/health') {
        const supabaseClient = new HyperdriveSupabaseClient(
          env.HYPERDRIVE,
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const dbConnected = await supabaseClient.testConnection();
        
        return new Response(JSON.stringify({
          status: dbConnected ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          services: {
            sync_coordinator: !!env.SYNC_COORDINATOR,
            hyperdrive: !!env.HYPERDRIVE,
            kv_cache: !!env.SYNC_CACHE,
            database: dbConnected
          }
        }), {
          status: dbConnected ? 200 : 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Manual sync trigger endpoint
      if (path === '/sync/trigger' && request.method === 'POST') {
        return await handleManualSync(request, env, ctx);
      }

      // Sync status endpoint
      if (path === '/sync/status') {
        return await handleSyncStatus(env);
      }

      // Sync statistics endpoint
      if (path === '/sync/stats') {
        return await handleSyncStats(env);
      }

      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Sync worker error:', error);
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
        console.log(`Processing scheduled sync for account: ${keapAccountId}`);
        
        try {
          await performSyncForAccount(keapAccountId, env, ctx);
        } catch (error) {
          console.error(`Scheduled sync failed for account ${keapAccountId}:`, error);
          
          // Store error in KV for monitoring
          await env.SYNC_CACHE.put(
            `sync_error:${keapAccountId}:${Date.now()}`,
            JSON.stringify({
              error: error.message,
              timestamp: new Date().toISOString(),
              type: 'scheduled_sync'
            }),
            { expirationTtl: 86400 } // 24 hours
          );
        }
      }
      
      console.log(`Scheduled sync completed for ${accountsData.keys.length} accounts`);
    } catch (error) {
      console.error('Scheduled sync error:', error);
    }
  }
} satisfies ExportedHandler<Env>;

/**
 * Handle manual sync trigger
 */
async function handleManualSync(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const { keapAccountId, syncType } = await request.json() as {
      keapAccountId: string;
      syncType?: 'contacts' | 'orders' | 'tags' | 'subscriptions' | 'all';
    };

    if (!keapAccountId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing keapAccountId'
      }), { status: 400 });
    }

    // Perform sync in the background
    ctx.waitUntil(performSyncForAccount(keapAccountId, env, ctx, syncType));

    return new Response(JSON.stringify({
      success: true,
      message: `Sync triggered for account ${keapAccountId}`,
      syncType: syncType || 'all'
    }));

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500 });
  }
}

/**
 * Handle sync status request
 */
async function handleSyncStatus(env: Env): Promise<Response> {
  try {
    const supabaseClient = new HyperdriveSupabaseClient(
      env.HYPERDRIVE,
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    const syncStatus = await supabaseClient.getSyncStatus();
    const pendingConflicts = await supabaseClient.getPendingSyncConflicts();

    return Response.json({
      syncStatus,
      pendingConflicts: pendingConflicts.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Handle sync statistics request
 */
async function handleSyncStats(env: Env): Promise<Response> {
  try {
    const supabaseClient = new HyperdriveSupabaseClient(
      env.HYPERDRIVE,
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    const stats = await supabaseClient.getSyncStatistics();

    return Response.json(stats);

  } catch (error) {
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Perform sync operations for a specific Keap account
 */
async function performSyncForAccount(
  keapAccountId: string, 
  env: Env, 
  ctx: ExecutionContext,
  syncType: string = 'all'
): Promise<void> {
  console.log(`Starting sync for account ${keapAccountId}, type: ${syncType}`);

  try {
    // Get access token from sync coordinator
    const tokenResponse = await env.SYNC_COORDINATOR.fetch(
      `https://sync-coordinator.workers.dev/keap/${keapAccountId}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keapAccountId })
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json() as { access_token: string };
    
    // Initialize clients
    const keapClient = new RateLimitedKeapClient(tokenData.access_token);
    const supabaseClient = new HyperdriveSupabaseClient(
      env.HYPERDRIVE,
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Perform sync operations based on type
    switch (syncType) {
      case 'contacts':
        await syncContacts(keapClient, supabaseClient, keapAccountId);
        break;
      case 'orders':
        await syncOrders(keapClient, supabaseClient, keapAccountId);
        break;
      case 'tags':
        await syncTags(keapClient, supabaseClient, keapAccountId);
        break;
      case 'subscriptions':
        await syncSubscriptions(keapClient, supabaseClient, keapAccountId);
        break;
      case 'all':
      default:
        await syncContacts(keapClient, supabaseClient, keapAccountId);
        await syncOrders(keapClient, supabaseClient, keapAccountId);
        await syncTags(keapClient, supabaseClient, keapAccountId);
        await syncSubscriptions(keapClient, supabaseClient, keapAccountId);
        break;
    }

    // Update last sync time in KV
    await env.SYNC_CACHE.put(
      `last_sync:${keapAccountId}`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        syncType,
        status: 'completed'
      }),
      { expirationTtl: 604800 } // 7 days
    );

    console.log(`Sync completed successfully for account ${keapAccountId}`);

  } catch (error) {
    console.error(`Sync failed for account ${keapAccountId}:`, error);
    
    // Update error status in KV
    await env.SYNC_CACHE.put(
      `last_sync:${keapAccountId}`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        syncType,
        status: 'failed',
        error: error.message
      }),
      { expirationTtl: 604800 } // 7 days
    );
    
    throw error;
  }
}

/**
 * Sync contacts between Keap and Supabase
 */
async function syncContacts(
  keapClient: RateLimitedKeapClient,
  supabaseClient: HyperdriveSupabaseClient,
  keapAccountId: string
): Promise<void> {
  console.log('Syncing contacts...');

  try {
    // Get all contacts from Keap (with pagination)
    let offset = 0;
    const limit = 100;
    let hasMoreContacts = true;
    let totalContacts = 0;

    while (hasMoreContacts) {
      const contacts = await keapClient.getContacts(limit, offset);
      
      if (contacts.length === 0) {
        hasMoreContacts = false;
        break;
      }

      // Batch upsert contacts to Supabase
      await supabaseClient.batchUpsertContacts(contacts);
      
      // Update sync status for each contact
      for (const contact of contacts) {
        await supabaseClient.upsertSyncStatus({
          entity_type: 'contact',
          entity_id: contact.id,
          keap_id: contact.id,
          last_synced_at: new Date().toISOString(),
          sync_direction: 'keap_to_supabase',
          conflict_status: 'none'
        });
      }

      totalContacts += contacts.length;
      offset += limit;

      console.log(`Synced ${totalContacts} contacts so far...`);

      // If we got fewer than the limit, we've reached the end
      if (contacts.length < limit) {
        hasMoreContacts = false;
      }
    }

    console.log(`Contact sync completed. Total contacts: ${totalContacts}`);

  } catch (error) {
    console.error('Contact sync error:', error);
    throw error;
  }
}

/**
 * Sync orders between Keap and Supabase
 */
async function syncOrders(
  keapClient: RateLimitedKeapClient,
  supabaseClient: HyperdriveSupabaseClient,
  keapAccountId: string
): Promise<void> {
  console.log('Syncing orders...');

  try {
    let offset = 0;
    const limit = 100;
    let hasMoreOrders = true;
    let totalOrders = 0;

    while (hasMoreOrders) {
      const orders = await keapClient.getOrders(limit, offset);
      
      if (orders.length === 0) {
        hasMoreOrders = false;
        break;
      }

      await supabaseClient.batchUpsertOrders(orders);
      
      for (const order of orders) {
        await supabaseClient.upsertSyncStatus({
          entity_type: 'order',
          entity_id: order.id,
          keap_id: order.id,
          last_synced_at: new Date().toISOString(),
          sync_direction: 'keap_to_supabase',
          conflict_status: 'none'
        });
      }

      totalOrders += orders.length;
      offset += limit;

      if (orders.length < limit) {
        hasMoreOrders = false;
      }
    }

    console.log(`Order sync completed. Total orders: ${totalOrders}`);

  } catch (error) {
    console.error('Order sync error:', error);
    throw error;
  }
}

/**
 * Sync tags between Keap and Supabase
 */
async function syncTags(
  keapClient: RateLimitedKeapClient,
  supabaseClient: HyperdriveSupabaseClient,
  keapAccountId: string
): Promise<void> {
  console.log('Syncing tags...');

  try {
    const tags = await keapClient.getTags();
    
    if (tags.length > 0) {
      await supabaseClient.batchUpsertTags(tags);
      
      for (const tag of tags) {
        await supabaseClient.upsertSyncStatus({
          entity_type: 'tag',
          entity_id: tag.id,
          keap_id: tag.id,
          last_synced_at: new Date().toISOString(),
          sync_direction: 'keap_to_supabase',
          conflict_status: 'none'
        });
      }
    }

    console.log(`Tag sync completed. Total tags: ${tags.length}`);

  } catch (error) {
    console.error('Tag sync error:', error);
    throw error;
  }
}

/**
 * Sync subscriptions between Keap and Supabase
 */
async function syncSubscriptions(
  keapClient: RateLimitedKeapClient,
  supabaseClient: HyperdriveSupabaseClient,
  keapAccountId: string
): Promise<void> {
  console.log('Syncing subscriptions...');

  try {
    let offset = 0;
    const limit = 100;
    let hasMoreSubscriptions = true;
    let totalSubscriptions = 0;

    while (hasMoreSubscriptions) {
      const subscriptions = await keapClient.getSubscriptions(limit, offset);
      
      if (subscriptions.length === 0) {
        hasMoreSubscriptions = false;
        break;
      }

      await supabaseClient.batchUpsertSubscriptions(subscriptions);
      
      for (const subscription of subscriptions) {
        await supabaseClient.upsertSyncStatus({
          entity_type: 'subscription',
          entity_id: subscription.id,
          keap_id: subscription.id,
          last_synced_at: new Date().toISOString(),
          sync_direction: 'keap_to_supabase',
          conflict_status: 'none'
        });
      }

      totalSubscriptions += subscriptions.length;
      offset += limit;

      if (subscriptions.length < limit) {
        hasMoreSubscriptions = false;
      }
    }

    console.log(`Subscription sync completed. Total subscriptions: ${totalSubscriptions}`);

  } catch (error) {
    console.error('Subscription sync error:', error);
    throw error;
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
