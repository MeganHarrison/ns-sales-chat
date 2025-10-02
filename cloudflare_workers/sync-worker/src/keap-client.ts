/**
 * Rate-Limited Keap API Client
 * 
 * Provides a rate-limited client for interacting with the Keap CRM API
 * while respecting the 1500 requests per minute limit.
 */

export interface KeapContact {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdDate?: string;
  lastUpdated?: string;
}

export interface KeapOrder {
  id: string;
  contactId: string;
  orderTitle?: string;
  orderTotal?: number;
  orderStatus?: string;
  orderDate?: string;
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface KeapTag {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface KeapSubscription {
  id: string;
  contactId: string;
  productId: string;
  status: string;
  frequency?: string;
  amount?: number;
  nextChargeDate?: string;
  createdDate?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  retryAttempts: number;
  backoffMultiplier: number;
}

export class RateLimitedKeapClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStartTime = 0;
  
  private readonly config: RateLimitConfig = {
    requestsPerMinute: 1400, // Leave buffer for safety (Keap limit is 1500)
    burstLimit: 50, // Max requests in a burst
    retryAttempts: 3,
    backoffMultiplier: 2
  };

  constructor(private accessToken: string, private baseUrl: string = 'https://api.keap.com/v2') {
  }

  /**
   * Make a rate-limited request to the Keap API
   */
  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.waitForRateLimit();
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * Get all contacts with pagination
   */
  async getContacts(limit: number = 100, offset: number = 0): Promise<KeapContact[]> {
    return this.makeRequest(async () => {
      const response = await fetch(`${this.baseUrl}/contacts?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return data.contacts || [];
    });
  }

  /**
   * Get a specific contact by ID
   */
  async getContact(contactId: string): Promise<KeapContact | null> {
    return this.makeRequest(async () => {
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch contact: ${response.status} ${await response.text()}`);
      }

      return await response.json();
    });
  }

  /**
   * Create a new contact
   */
  async createContact(contact: Partial<KeapContact>): Promise<KeapContact> {
    return this.makeRequest(async () => {
      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contact)
      });

      if (!response.ok) {
        throw new Error(`Failed to create contact: ${response.status} ${await response.text()}`);
      }

      return await response.json();
    });
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, updates: Partial<KeapContact>): Promise<KeapContact> {
    return this.makeRequest(async () => {
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update contact: ${response.status} ${await response.text()}`);
      }

      return await response.json();
    });
  }

  /**
   * Get all orders with pagination
   */
  async getOrders(limit: number = 100, offset: number = 0): Promise<KeapOrder[]> {
    return this.makeRequest(async () => {
      const response = await fetch(`${this.baseUrl}/orders?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return data.orders || [];
    });
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<KeapTag[]> {
    return this.makeRequest(async () => {
      const response = await fetch(`${this.baseUrl}/tags`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return data.tags || [];
    });
  }

  /**
   * Get subscriptions (recurring orders)
   */
  async getSubscriptions(limit: number = 100, offset: number = 0): Promise<KeapSubscription[]> {
    return this.makeRequest(async () => {
      const response = await fetch(`${this.baseUrl}/subscriptions?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subscriptions: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return data.subscriptions || [];
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const requestFn = this.requestQueue.shift();
      if (requestFn) {
        try {
          await requestFn();
        } catch (error) {
          console.error('Request failed:', error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Wait for rate limit to allow the next request
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    // Reset counter if we're in a new time window
    if (now - this.windowStartTime >= timeWindow) {
      this.requestCount = 0;
      this.windowStartTime = now;
    }

    // Check if we've exceeded the rate limit
    if (this.requestCount >= this.config.requestsPerMinute) {
      const waitTime = timeWindow - (now - this.windowStartTime);
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset for the new window
      this.requestCount = 0;
      this.windowStartTime = Date.now();
    }

    // Add a small delay between requests to avoid bursts
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 60000 / this.config.requestsPerMinute; // Minimum time between requests
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx), only on server errors (5xx) and network issues
        if (error.message.includes('40')) { // 400-level errors
          throw error;
        }
        
        if (attempt < this.config.retryAttempts) {
          const backoffTime = Math.pow(this.config.backoffMultiplier, attempt - 1) * 1000;
          console.log(`Request failed (attempt ${attempt}), retrying in ${backoffTime}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Update the access token (for token refresh)
   */
  updateToken(newToken: string): void {
    this.accessToken = newToken;
  }

  /**
   * Get current rate limit statistics
   */
  getRateLimitStats() {
    return {
      requestCount: this.requestCount,
      queueLength: this.requestQueue.length,
      processing: this.processing,
      windowStartTime: this.windowStartTime,
      timeUntilReset: Math.max(0, 60000 - (Date.now() - this.windowStartTime))
    };
  }
}