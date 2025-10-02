/**
 * SyncCoordinator Durable Object
 * 
 * Manages OAuth tokens and sync state for Keap-Supabase bidirectional sync.
 * Provides strong consistency for token management and sync coordination.
 */

export interface Env {
  SYNC_COORDINATOR: DurableObjectNamespace;
  SYNC_CACHE: KVNamespace;
  HYPERDRIVE: Hyperdrive;
  
  // OAuth Configuration
  KEAP_CLIENT_ID: string;
  KEAP_CLIENT_SECRET: string;
  KEAP_REDIRECT_URI: string;
  KEAP_WEBHOOK_SECRET: string;
  
  // Supabase Configuration
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastRefreshed: number;
}

export interface WebhookEvent {
  eventType: string;
  objectKeys: string[];
  timestamp: number;
}

export class SyncCoordinator implements DurableObject {
  private storage: DurableObjectStorage;
  private env: Env;
  
  constructor(ctx: DurableObjectState, env: Env) {
    this.storage = ctx.storage;
    this.env = env;
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/oauth/initiate':
          return await this.handleOAuthInitiate(request);
        case '/oauth/callback':
          return await this.handleOAuthCallback(request);
        case '/oauth/token':
          return await this.handleGetToken(request);
        case '/sync/trigger':
          return await this.handleSyncTrigger(request);
        case '/webhook/process':
          return await this.handleWebhookProcess(request);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('SyncCoordinator error:', error);
      return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  }

  /**
   * Initiate OAuth flow - redirect user to Keap
   */
  private async handleOAuthInitiate(request: Request): Promise<Response> {
    const { keapAccountId } = await request.json() as { keapAccountId: string };
    
    if (!keapAccountId) {
      return new Response('Missing keapAccountId', { status: 400 });
    }

    const authUrl = await this.initiateOAuth(keapAccountId);
    return Response.json({ auth_url: authUrl });
  }

  /**
   * Handle OAuth callback from Keap
   */
  private async handleOAuthCallback(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return new Response('Missing code or state', { status: 400 });
    }

    try {
      const tokens = await this.exchangeCodeForTokens(code, state);
      return Response.json({ success: true, message: 'OAuth completed successfully' });
    } catch (error) {
      return new Response(`OAuth callback error: ${error.message}`, { status: 400 });
    }
  }

  /**
   * Get a valid token for Keap API calls
   */
  private async handleGetToken(request: Request): Promise<Response> {
    const { keapAccountId } = await request.json() as { keapAccountId: string };
    
    if (!keapAccountId) {
      return new Response('Missing keapAccountId', { status: 400 });
    }

    try {
      const token = await this.getValidToken(keapAccountId);
      return Response.json({ access_token: token });
    } catch (error) {
      return new Response(`Token error: ${error.message}`, { status: 400 });
    }
  }

  /**
   * Trigger manual sync operation
   */
  private async handleSyncTrigger(request: Request): Promise<Response> {
    const { keapAccountId, syncType } = await request.json() as { 
      keapAccountId: string; 
      syncType?: 'contacts' | 'orders' | 'tags' | 'subscriptions' | 'all';
    };
    
    if (!keapAccountId) {
      return new Response('Missing keapAccountId', { status: 400 });
    }

    // Store sync trigger request
    await this.storage.put(`sync_trigger:${Date.now()}`, {
      keapAccountId,
      syncType: syncType || 'all',
      status: 'pending',
      triggeredAt: Date.now()
    });

    return Response.json({ success: true, message: 'Sync triggered' });
  }

  /**
   * Process webhook event from Keap
   */
  private async handleWebhookProcess(request: Request): Promise<Response> {
    const webhookData = await request.json() as WebhookEvent;
    
    // Store webhook event for processing
    const eventId = `webhook:${webhookData.timestamp}:${crypto.randomUUID()}`;
    await this.storage.put(eventId, {
      ...webhookData,
      status: 'pending',
      receivedAt: Date.now()
    });

    return Response.json({ success: true });
  }

  /**
   * Initialize OAuth flow - redirect user to Keap
   */
  async initiateOAuth(keapAccountId: string): Promise<string> {
    const state = crypto.randomUUID();
    await this.storage.put(`oauth_state:${state}`, { 
      keapAccountId, 
      timestamp: Date.now() 
    });
    
    const authUrl = new URL('https://accounts.infusionsoft.com/app/oauth/authorize');
    authUrl.searchParams.set('client_id', this.env.KEAP_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', this.env.KEAP_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'full'); // CRITICAL: Only supported scope
    authUrl.searchParams.set('state', state);
    
    return authUrl.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<TokenResponse> {
    // Validate state parameter to prevent CSRF
    const stateData = await this.storage.get(`oauth_state:${state}`) as { 
      keapAccountId: string; 
      timestamp: number; 
    } | undefined;
    
    if (!stateData || Date.now() - stateData.timestamp > 600000) { // 10 min expiry
      throw new Error('Invalid or expired state');
    }

    const tokenRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.env.KEAP_CLIENT_ID,
        client_secret: this.env.KEAP_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.env.KEAP_REDIRECT_URI
      })
    };
    
    const response = await fetch('https://api.infusionsoft.com/token', tokenRequest);
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
    }
    
    const tokens: TokenResponse = await response.json();
    
    // Store tokens in Durable Object storage
    await this.storeTokens(stateData.keapAccountId, tokens);
    
    // Clean up state
    await this.storage.delete(`oauth_state:${state}`);
    
    return tokens;
  }

  /**
   * Get a valid token, refreshing if necessary
   */
  async getValidToken(keapAccountId: string): Promise<string> {
    const tokens = await this.storage.get(`oauth:${keapAccountId}`) as StoredTokens | undefined;
    
    if (!tokens) {
      throw new Error('No tokens found for account. OAuth required.');
    }

    // Check if token is expiring soon (within 5 minutes)
    if (this.isTokenExpiringSoon(tokens.expiresAt)) {
      return await this.refreshToken(keapAccountId, tokens.refreshToken);
    }
    
    return tokens.accessToken;
  }

  /**
   * Check if token is expiring within 5 minutes
   */
  private isTokenExpiringSoon(expiresAt: number): boolean {
    return Date.now() >= (expiresAt - 300000); // 5 minutes buffer
  }

  /**
   * Refresh token before expiry
   */
  async refreshToken(keapAccountId: string, refreshToken: string): Promise<string> {
    const credentials = btoa(`${this.env.KEAP_CLIENT_ID}:${this.env.KEAP_CLIENT_SECRET}`);
    
    const refreshRequest = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`, // CRITICAL: Required format
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    };
    
    const response = await fetch('https://api.infusionsoft.com/token', refreshRequest);
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`);
    }
    
    const tokens: TokenResponse = await response.json();
    
    // Store new tokens
    await this.storeTokens(keapAccountId, tokens);
    
    return tokens.access_token;
  }

  /**
   * Store tokens with proper expiration handling
   */
  private async storeTokens(keapAccountId: string, tokens: TokenResponse): Promise<void> {
    const storedTokens: StoredTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token, // MUST use new refresh token
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      lastRefreshed: Date.now()
    };
    
    await this.storage.put(`oauth:${keapAccountId}`, storedTokens);
    
    // Schedule automatic refresh every 21 hours to prevent expiry
    await this.scheduleTokenRefresh(keapAccountId);
  }

  /**
   * Schedule automatic refresh every 21 hours to prevent expiry
   */
  private async scheduleTokenRefresh(keapAccountId: string): Promise<void> {
    const refreshTime = Date.now() + (21 * 60 * 60 * 1000); // 21 hours
    await this.storage.put(`refresh_schedule:${keapAccountId}`, { refreshTime });
  }

  /**
   * Process scheduled sync operations
   */
  async performScheduledSync(keapClient: any, supabaseClient: any): Promise<void> {
    // Get all pending sync triggers
    const triggers = await this.storage.list({ prefix: 'sync_trigger:' });
    
    for (const [key, value] of triggers) {
      const syncTrigger = value as any;
      if (syncTrigger.status === 'pending') {
        try {
          // Process sync based on type
          await this.executeSyncOperation(syncTrigger, keapClient, supabaseClient);
          
          // Mark as completed
          await this.storage.put(key, { ...syncTrigger, status: 'completed' });
        } catch (error) {
          console.error('Sync operation failed:', error);
          await this.storage.put(key, { 
            ...syncTrigger, 
            status: 'failed', 
            error: error.message 
          });
        }
      }
    }
  }

  /**
   * Execute sync operation based on type
   */
  private async executeSyncOperation(syncTrigger: any, keapClient: any, supabaseClient: any): Promise<void> {
    const { keapAccountId, syncType } = syncTrigger;
    
    // Get valid token
    const token = await this.getValidToken(keapAccountId);
    
    switch (syncType) {
      case 'contacts':
        await this.syncContacts(token, keapClient, supabaseClient);
        break;
      case 'orders':
        await this.syncOrders(token, keapClient, supabaseClient);
        break;
      case 'tags':
        await this.syncTags(token, keapClient, supabaseClient);
        break;
      case 'subscriptions':
        await this.syncSubscriptions(token, keapClient, supabaseClient);
        break;
      case 'all':
        await this.syncContacts(token, keapClient, supabaseClient);
        await this.syncOrders(token, keapClient, supabaseClient);
        await this.syncTags(token, keapClient, supabaseClient);
        await this.syncSubscriptions(token, keapClient, supabaseClient);
        break;
    }
  }

  /**
   * Sync contacts between Keap and Supabase
   */
  private async syncContacts(token: string, keapClient: any, supabaseClient: any): Promise<void> {
    // Implementation will be completed in sync worker
    console.log('Syncing contacts...');
  }

  /**
   * Sync orders between Keap and Supabase
   */
  private async syncOrders(token: string, keapClient: any, supabaseClient: any): Promise<void> {
    // Implementation will be completed in sync worker
    console.log('Syncing orders...');
  }

  /**
   * Sync tags between Keap and Supabase
   */
  private async syncTags(token: string, keapClient: any, supabaseClient: any): Promise<void> {
    // Implementation will be completed in sync worker
    console.log('Syncing tags...');
  }

  /**
   * Sync subscriptions between Keap and Supabase
   */
  private async syncSubscriptions(token: string, keapClient: any, supabaseClient: any): Promise<void> {
    // Implementation will be completed in sync worker
    console.log('Syncing subscriptions...');
  }
}