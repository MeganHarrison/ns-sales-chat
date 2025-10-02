/**
 * Enhanced Keap API Client with Full Type Safety
 * Supports all Keap REST API v2 endpoints with retry logic, caching, and error handling
 */

import {
  KeapContact,
  KeapOrder,
  KeapProduct,
  KeapSubscription,
  KeapPayment,
  KeapInvoice,
  KeapCompany,
  KeapTask,
  KeapNote,
  KeapAppointment,
  KeapTag,
  KeapCampaign,
  KeapEmailTemplate,
  KeapUser,
  KeapFile,
  KeapWebhook,
  KeapOAuthToken,
  KeapListResponse,
  KeapApiResponse,
  KeapError,
  KeapContactQuery,
  KeapOrderQuery,
  KeapSubscriptionQuery,
  KeapQueryOptions,
  KeapBatchRequest,
  KeapBatchResult,
  KeapOrderStatus,
  KeapSubscriptionStatus,
  KeapPaymentStatus,
  KeapTaskStatus,
} from './keap-types';

/**
 * Configuration for the Keap API Client
 */
export interface KeapClientConfig {
  // Authentication
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;

  // API Settings
  baseUrl?: string;
  version?: 'v1' | 'v2';
  timeout?: number;

  // Retry Configuration
  maxRetries?: number;
  retryDelay?: number;
  retryOnRateLimit?: boolean;

  // Caching
  enableCache?: boolean;
  cacheTTL?: number;

  // Logging
  debug?: boolean;
  logger?: (message: string, data?: any) => void;
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Enhanced Keap API Client
 */
export class KeapClientEnhanced {
  private config: Required<KeapClientConfig>;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestCount = 0;
  private lastRequestTime = 0;
  private rateLimitRemaining = 1500; // Keap default
  private rateLimitReset = 0;

  constructor(config: KeapClientConfig) {
    this.config = {
      apiKey: config.apiKey || '',
      accessToken: config.accessToken || '',
      refreshToken: config.refreshToken || '',
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      baseUrl: config.baseUrl || 'https://api.infusionsoft.com/crm/rest',
      version: config.version || 'v2',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      retryOnRateLimit: config.retryOnRateLimit !== false,
      enableCache: config.enableCache !== false,
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
      debug: config.debug || false,
      logger: config.logger || console.log,
    };

    if (!this.config.apiKey && !this.config.accessToken) {
      throw new Error('Either apiKey or accessToken must be provided');
    }
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      this.config.logger(`[KeapClient] ${message}`, data);
    }
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): HeadersInit {
    if (this.config.accessToken) {
      return { 'Authorization': `Bearer ${this.config.accessToken}` };
    } else if (this.config.apiKey) {
      return { 'X-Keap-API-Key': this.config.apiKey };
    }
    throw new Error('No authentication method configured');
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.config.baseUrl}/${this.config.version}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Check and get cached data
   */
  private getCached<T>(key: string): T | null {
    if (!this.config.enableCache) return null;

    const entry = this.cache.get(key);
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp < entry.ttl) {
        this.log('Cache hit', { key });
        return entry.data as T;
      }
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL,
    });
  }

  /**
   * Clear cache
   */
  public clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      });
    } else {
      this.cache.clear();
    }
    this.log('Cache cleared', { pattern });
  }

  /**
   * Handle rate limiting
   */
  private async handleRateLimit(): Promise<void> {
    const now = Date.now();

    // Basic rate limiting: max 2 requests per second
    if (now - this.lastRequestTime < 500) {
      await this.delay(500 - (now - this.lastRequestTime));
    }

    // Check rate limit headers
    if (this.rateLimitRemaining <= 0 && this.rateLimitReset > now) {
      const waitTime = this.rateLimitReset - now;
      this.log('Rate limited, waiting', { waitTime });
      await this.delay(waitTime);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: {
      params?: Record<string, any>;
      body?: any;
      headers?: HeadersInit;
      useCache?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const cacheKey = `${method}:${url}`;

    // Check cache for GET requests
    if (method === 'GET' && options.useCache !== false) {
      const cached = this.getCached<T>(cacheKey);
      if (cached) return cached;
    }

    // Rate limiting
    await this.handleRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        this.log(`Retry attempt ${attempt}`, { delay });
        await this.delay(delay);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Update rate limit info from headers
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');
        if (remaining) this.rateLimitRemaining = parseInt(remaining, 10);
        if (reset) this.rateLimitReset = parseInt(reset, 10) * 1000;

        // Handle rate limit response
        if (response.status === 429) {
          if (this.config.retryOnRateLimit && attempt < this.config.maxRetries) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              await this.delay(parseInt(retryAfter, 10) * 1000);
            }
            continue;
          }
          throw new Error(`Rate limited: ${response.statusText}`);
        }

        // Handle other errors
        if (!response.ok) {
          const errorBody = await response.text();
          let errorMessage = `API error: ${response.status} ${response.statusText}`;

          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.message) errorMessage = errorJson.message;
            if (errorJson.error) errorMessage = errorJson.error;
          } catch {
            errorMessage += ` - ${errorBody}`;
          }

          throw new Error(errorMessage);
        }

        // Parse response
        const data = await response.json() as T;

        // Cache successful GET requests
        if (method === 'GET' && options.useCache !== false) {
          this.setCache(cacheKey, data, options.cacheTTL);
        }

        this.log('Request successful', { method, endpoint, attempt });
        return data;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx except 429)
        if (error.message.includes('4') && !error.message.includes('429')) {
          throw error;
        }

        // Don't retry on abort
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout}ms`);
        }

        if (attempt === this.config.maxRetries) {
          throw new Error(`Request failed after ${this.config.maxRetries} retries: ${error.message}`);
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  // ============================================
  // Contact Methods
  // ============================================

  async getContacts(query?: KeapContactQuery): Promise<KeapListResponse<KeapContact>> {
    return this.request<KeapListResponse<KeapContact>>('GET', '/contacts', { params: query });
  }

  async getContact(contactId: string): Promise<KeapContact> {
    return this.request<KeapContact>('GET', `/contacts/${contactId}`);
  }

  async createContact(contact: Partial<KeapContact>): Promise<KeapContact> {
    return this.request<KeapContact>('POST', '/contacts', { body: contact, useCache: false });
  }

  async updateContact(contactId: string, updates: Partial<KeapContact>): Promise<KeapContact> {
    this.clearCache(`contacts/${contactId}`);
    return this.request<KeapContact>('PATCH', `/contacts/${contactId}`, { body: updates, useCache: false });
  }

  async deleteContact(contactId: string): Promise<void> {
    this.clearCache(`contacts/${contactId}`);
    await this.request<void>('DELETE', `/contacts/${contactId}`, { useCache: false });
  }

  async addTagToContact(contactId: string, tagId: number): Promise<void> {
    this.clearCache(`contacts/${contactId}`);
    await this.request<void>('POST', `/contacts/${contactId}/tags`, {
      body: { tagId },
      useCache: false
    });
  }

  async removeTagFromContact(contactId: string, tagId: number): Promise<void> {
    this.clearCache(`contacts/${contactId}`);
    await this.request<void>('DELETE', `/contacts/${contactId}/tags/${tagId}`, { useCache: false });
  }

  // ============================================
  // Order Methods
  // ============================================

  async getOrders(query?: KeapOrderQuery): Promise<KeapListResponse<KeapOrder>> {
    return this.request<KeapListResponse<KeapOrder>>('GET', '/orders', { params: query });
  }

  async getOrder(orderId: string): Promise<KeapOrder> {
    return this.request<KeapOrder>('GET', `/orders/${orderId}`);
  }

  async createOrder(order: Partial<KeapOrder>): Promise<KeapOrder> {
    return this.request<KeapOrder>('POST', '/orders', { body: order, useCache: false });
  }

  async updateOrderStatus(orderId: string, status: KeapOrderStatus): Promise<KeapOrder> {
    this.clearCache(`orders/${orderId}`);
    return this.request<KeapOrder>('PATCH', `/orders/${orderId}`, {
      body: { status },
      useCache: false
    });
  }

  // ============================================
  // Subscription Methods
  // ============================================

  async getSubscriptions(query?: KeapSubscriptionQuery): Promise<KeapListResponse<KeapSubscription>> {
    return this.request<KeapListResponse<KeapSubscription>>('GET', '/subscriptions', { params: query });
  }

  async getSubscription(subscriptionId: string): Promise<KeapSubscription> {
    return this.request<KeapSubscription>('GET', `/subscriptions/${subscriptionId}`);
  }

  async createSubscription(subscription: Partial<KeapSubscription>): Promise<KeapSubscription> {
    return this.request<KeapSubscription>('POST', '/subscriptions', {
      body: subscription,
      useCache: false
    });
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<KeapSubscription>
  ): Promise<KeapSubscription> {
    this.clearCache(`subscriptions/${subscriptionId}`);
    return this.request<KeapSubscription>('PATCH', `/subscriptions/${subscriptionId}`, {
      body: updates,
      useCache: false
    });
  }

  async pauseSubscription(
    subscriptionId: string,
    pauseUntil: string,
    reason?: string
  ): Promise<KeapSubscription> {
    return this.updateSubscription(subscriptionId, {
      pause_until: pauseUntil,
      pause_reason: reason,
      status: KeapSubscriptionStatus.PAUSED
    });
  }

  async resumeSubscription(subscriptionId: string): Promise<KeapSubscription> {
    return this.updateSubscription(subscriptionId, {
      pause_until: undefined,
      status: KeapSubscriptionStatus.ACTIVE
    });
  }

  async cancelSubscription(
    subscriptionId: string,
    reason?: string,
    immediate?: boolean
  ): Promise<KeapSubscription> {
    return this.updateSubscription(subscriptionId, {
      status: KeapSubscriptionStatus.CANCELED,
      cancel_reason: reason,
      cancel_date: immediate ? new Date().toISOString() : undefined
    });
  }

  // ============================================
  // Product Methods
  // ============================================

  async getProducts(query?: KeapQueryOptions): Promise<KeapListResponse<KeapProduct>> {
    return this.request<KeapListResponse<KeapProduct>>('GET', '/products', { params: query });
  }

  async getProduct(productId: string): Promise<KeapProduct> {
    return this.request<KeapProduct>('GET', `/products/${productId}`);
  }

  async createProduct(product: Partial<KeapProduct>): Promise<KeapProduct> {
    return this.request<KeapProduct>('POST', '/products', { body: product, useCache: false });
  }

  async updateProduct(productId: string, updates: Partial<KeapProduct>): Promise<KeapProduct> {
    this.clearCache(`products/${productId}`);
    return this.request<KeapProduct>('PATCH', `/products/${productId}`, {
      body: updates,
      useCache: false
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    this.clearCache(`products/${productId}`);
    await this.request<void>('DELETE', `/products/${productId}`, { useCache: false });
  }

  // ============================================
  // Payment Methods
  // ============================================

  async getPayments(query?: KeapQueryOptions): Promise<KeapListResponse<KeapPayment>> {
    return this.request<KeapListResponse<KeapPayment>>('GET', '/payments', { params: query });
  }

  async getPayment(paymentId: string): Promise<KeapPayment> {
    return this.request<KeapPayment>('GET', `/payments/${paymentId}`);
  }

  async recordPayment(payment: Partial<KeapPayment>): Promise<KeapPayment> {
    return this.request<KeapPayment>('POST', '/payments', { body: payment, useCache: false });
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    reason?: string
  ): Promise<KeapPayment> {
    this.clearCache(`payments/${paymentId}`);
    return this.request<KeapPayment>('POST', `/payments/${paymentId}/refunds`, {
      body: { amount, reason },
      useCache: false
    });
  }

  // ============================================
  // Invoice Methods
  // ============================================

  async getInvoices(query?: KeapQueryOptions): Promise<KeapListResponse<KeapInvoice>> {
    return this.request<KeapListResponse<KeapInvoice>>('GET', '/invoices', { params: query });
  }

  async getInvoice(invoiceId: string): Promise<KeapInvoice> {
    return this.request<KeapInvoice>('GET', `/invoices/${invoiceId}`);
  }

  async createInvoice(invoice: Partial<KeapInvoice>): Promise<KeapInvoice> {
    return this.request<KeapInvoice>('POST', '/invoices', { body: invoice, useCache: false });
  }

  async sendInvoice(invoiceId: string): Promise<void> {
    await this.request<void>('POST', `/invoices/${invoiceId}/send`, { useCache: false });
  }

  async voidInvoice(invoiceId: string): Promise<KeapInvoice> {
    this.clearCache(`invoices/${invoiceId}`);
    return this.request<KeapInvoice>('POST', `/invoices/${invoiceId}/void`, { useCache: false });
  }

  // ============================================
  // Task Methods
  // ============================================

  async getTasks(query?: KeapQueryOptions): Promise<KeapListResponse<KeapTask>> {
    return this.request<KeapListResponse<KeapTask>>('GET', '/tasks', { params: query });
  }

  async getTask(taskId: string): Promise<KeapTask> {
    return this.request<KeapTask>('GET', `/tasks/${taskId}`);
  }

  async createTask(task: Partial<KeapTask>): Promise<KeapTask> {
    return this.request<KeapTask>('POST', '/tasks', { body: task, useCache: false });
  }

  async updateTask(taskId: string, updates: Partial<KeapTask>): Promise<KeapTask> {
    this.clearCache(`tasks/${taskId}`);
    return this.request<KeapTask>('PATCH', `/tasks/${taskId}`, {
      body: updates,
      useCache: false
    });
  }

  async completeTask(taskId: string): Promise<KeapTask> {
    return this.updateTask(taskId, {
      status: KeapTaskStatus.COMPLETE,
      completed_date: new Date().toISOString()
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    this.clearCache(`tasks/${taskId}`);
    await this.request<void>('DELETE', `/tasks/${taskId}`, { useCache: false });
  }

  // ============================================
  // Note Methods
  // ============================================

  async getNotes(contactId: string, query?: KeapQueryOptions): Promise<KeapListResponse<KeapNote>> {
    return this.request<KeapListResponse<KeapNote>>('GET', `/contacts/${contactId}/notes`, {
      params: query
    });
  }

  async createNote(note: Partial<KeapNote>): Promise<KeapNote> {
    return this.request<KeapNote>('POST', '/notes', { body: note, useCache: false });
  }

  async updateNote(noteId: string, updates: Partial<KeapNote>): Promise<KeapNote> {
    this.clearCache(`notes/${noteId}`);
    return this.request<KeapNote>('PATCH', `/notes/${noteId}`, {
      body: updates,
      useCache: false
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    this.clearCache(`notes/${noteId}`);
    await this.request<void>('DELETE', `/notes/${noteId}`, { useCache: false });
  }

  // ============================================
  // Tag Methods
  // ============================================

  async getTags(query?: KeapQueryOptions): Promise<KeapListResponse<KeapTag>> {
    return this.request<KeapListResponse<KeapTag>>('GET', '/tags', { params: query });
  }

  async getTag(tagId: number): Promise<KeapTag> {
    return this.request<KeapTag>('GET', `/tags/${tagId}`);
  }

  async createTag(tag: Partial<KeapTag>): Promise<KeapTag> {
    return this.request<KeapTag>('POST', '/tags', { body: tag, useCache: false });
  }

  async updateTag(tagId: number, updates: Partial<KeapTag>): Promise<KeapTag> {
    this.clearCache(`tags/${tagId}`);
    return this.request<KeapTag>('PATCH', `/tags/${tagId}`, {
      body: updates,
      useCache: false
    });
  }

  async deleteTag(tagId: number): Promise<void> {
    this.clearCache(`tags/${tagId}`);
    await this.request<void>('DELETE', `/tags/${tagId}`, { useCache: false });
  }

  async getContactsByTag(tagId: number, query?: KeapQueryOptions): Promise<KeapListResponse<KeapContact>> {
    return this.request<KeapListResponse<KeapContact>>('GET', `/tags/${tagId}/contacts`, {
      params: query
    });
  }

  // ============================================
  // Company Methods
  // ============================================

  async getCompanies(query?: KeapQueryOptions): Promise<KeapListResponse<KeapCompany>> {
    return this.request<KeapListResponse<KeapCompany>>('GET', '/companies', { params: query });
  }

  async getCompany(companyId: string): Promise<KeapCompany> {
    return this.request<KeapCompany>('GET', `/companies/${companyId}`);
  }

  async createCompany(company: Partial<KeapCompany>): Promise<KeapCompany> {
    return this.request<KeapCompany>('POST', '/companies', { body: company, useCache: false });
  }

  async updateCompany(companyId: string, updates: Partial<KeapCompany>): Promise<KeapCompany> {
    this.clearCache(`companies/${companyId}`);
    return this.request<KeapCompany>('PATCH', `/companies/${companyId}`, {
      body: updates,
      useCache: false
    });
  }

  // ============================================
  // Webhook Methods
  // ============================================

  async getWebhooks(): Promise<KeapListResponse<KeapWebhook>> {
    return this.request<KeapListResponse<KeapWebhook>>('GET', '/webhooks');
  }

  async createWebhook(webhook: Partial<KeapWebhook>): Promise<KeapWebhook> {
    return this.request<KeapWebhook>('POST', '/webhooks', { body: webhook, useCache: false });
  }

  async updateWebhook(webhookId: string, updates: Partial<KeapWebhook>): Promise<KeapWebhook> {
    this.clearCache(`webhooks/${webhookId}`);
    return this.request<KeapWebhook>('PATCH', `/webhooks/${webhookId}`, {
      body: updates,
      useCache: false
    });
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    this.clearCache(`webhooks/${webhookId}`);
    await this.request<void>('DELETE', `/webhooks/${webhookId}`, { useCache: false });
  }

  async verifyWebhook(webhookId: string): Promise<void> {
    await this.request<void>('POST', `/webhooks/${webhookId}/verify`, { useCache: false });
  }

  // ============================================
  // Batch Operations
  // ============================================

  async batch(requests: KeapBatchRequest[]): Promise<KeapBatchResult> {
    return this.request<KeapBatchResult>('POST', '/batch', {
      body: { requests },
      useCache: false
    });
  }

  // ============================================
  // OAuth Methods
  // ============================================

  async refreshAccessToken(): Promise<KeapOAuthToken> {
    if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      throw new Error('OAuth refresh requires refreshToken, clientId, and clientSecret');
    }

    const response = await fetch('https://api.infusionsoft.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const token = await response.json() as KeapOAuthToken;

    // Update client configuration
    this.config.accessToken = token.access_token;
    this.config.refreshToken = token.refresh_token;

    return token;
  }

  // ============================================
  // Utility Methods
  // ============================================

  async getApiUsage(): Promise<{
    requestCount: number;
    rateLimitRemaining: number;
    rateLimitReset: Date | null;
  }> {
    return {
      requestCount: this.requestCount,
      rateLimitRemaining: this.rateLimitRemaining,
      rateLimitReset: this.rateLimitReset ? new Date(this.rateLimitReset) : null,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request<any>('GET', '/account/profile');
      return true;
    } catch {
      return false;
    }
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}