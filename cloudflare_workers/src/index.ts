import { KeapClient } from '../workers/keap-client';
import { KeapXMLRPCClient, formatDateForKeap } from '../workers/keap-xmlrpc-client';
import { SupabaseService, SupabaseOrder } from './supabase-client';
import { CacheService, CacheKeys, CacheTTL } from './cache-service-stub';
import { DataSync, DashboardAnalytics, WebhookHandler, WebhookPayload } from './stubs';
import { SupabaseSync } from './supabase-sync';

// Fixed Nutrition Solutions Worker - Includes both analytics AND original keap-orders endpoint
export interface Env {
  DB: D1Database; // Changed from DB01 to match wrangler.toml
  DB01?: D1Database; // Keep for backwards compatibility
  CACHE: KVNamespace;
  KEAP_SERVICE_ACCOUNT_KEY: string;
  KEAP_APP_ID?: string;
  HYPERDRIVE?: Hyperdrive;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

interface KeapOrder {
  id: number;
  order_date: string;
  order_total: number;
  contact_id: number;
  order_title: string;
  order_type: string;
  payment_status: string;
  lead_affiliate_id?: number;
  order_items?: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

// Keap API Client
class KeapAPIClient {
  private baseUrl = 'https://api.infusionsoft.com/crm/rest/v1';
  private serviceAccountKey: string;

  constructor(serviceAccountKey: string) {
    this.serviceAccountKey = serviceAccountKey;
  }

  async fetchContacts(limit: number = 1000, offset: number = 0): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/contacts?limit=${limit}&offset=${offset}`;
      console.log('Fetching contacts from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.serviceAccountKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Keap API Error:', errorText);
        throw new Error(`Keap API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const contacts = data.contacts || [];
      console.log(`Found ${contacts.length} contacts`);

      return contacts;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  async fetchAllContacts(): Promise<any[]> {
    const allContacts: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    console.log('Starting to fetch all contacts...');

    while (hasMore) {
      try {
        const url = `${this.baseUrl}/contacts?limit=${limit}&offset=${offset}`;
        console.log(`Fetching contacts batch: offset=${offset}, limit=${limit}`);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.serviceAccountKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Keap API Error:', errorText);
          throw new Error(`Keap API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const contacts = data.contacts || [];

        if (contacts.length === 0) {
          hasMore = false;
        } else {
          allContacts.push(...contacts);
          offset += contacts.length;
          console.log(`Fetched ${contacts.length} contacts, total so far: ${allContacts.length}`);

          // Check if there's a 'next' link or if we got less than limit
          if (contacts.length < limit || !data.next) {
            hasMore = false;
          }
        }
      } catch (error) {
        console.error('Error fetching contacts batch:', error);
        hasMore = false; // Stop on error
      }
    }

    console.log(`Finished fetching all contacts. Total: ${allContacts.length}`);
    return allContacts;
  }

  async fetchProducts(limit: number = 1000, offset: number = 0): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/products?limit=${limit}&offset=${offset}`;
      console.log('Fetching products from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.serviceAccountKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Keap API Error:', errorText);
        throw new Error(`Keap API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const products = data.products || [];
      console.log(`Found ${products.length} products`);

      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async fetchSubscriptions(limit: number = 1000, offset: number = 0): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/subscriptions?limit=${limit}&offset=${offset}`;
      console.log('Fetching subscriptions from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.serviceAccountKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Keap API Error:', errorText);
        throw new Error(`Keap API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const subscriptions = data.subscriptions || [];
      console.log(`Found ${subscriptions.length} subscriptions`);

      return subscriptions;
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }
  }

  async fetchOrders(limit: number = 1000): Promise<KeapOrder[]> {
    try {
      const url = `${this.baseUrl}/orders?limit=${limit}`;
      console.log('Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.serviceAccountKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Keap API Error:', errorText);
        throw new Error(`Keap API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw API response keys:', Object.keys(data));

      // Keap returns orders in different possible structures
      const orders = data.orders || data.results || data || [];
      console.log(`Found ${orders.length} orders`);

      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async fetchAllOrders(): Promise<KeapOrder[]> {
    const allOrders: KeapOrder[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    console.log('Starting to fetch all orders...');

    while (hasMore) {
      try {
        const url = `${this.baseUrl}/orders?limit=${limit}&offset=${offset}`;
        console.log(`Fetching orders batch: offset=${offset}, limit=${limit}`);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.serviceAccountKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Keap API Error:', errorText);
          throw new Error(`Keap API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const orders = data.orders || [];

        if (orders.length === 0) {
          hasMore = false;
        } else {
          allOrders.push(...orders);
          offset += orders.length;
          console.log(`Fetched ${orders.length} orders, total so far: ${allOrders.length}`);

          // Check if there's a 'next' link or if we got less than limit
          if (orders.length < limit || !data.next) {
            hasMore = false;
          }
        }
      } catch (error) {
        console.error('Error fetching orders batch:', error);
        hasMore = false; // Stop on error
      }
    }

    console.log(`Finished fetching all orders. Total: ${allOrders.length}`);
    return allOrders;
  }
}

// Analytics class (simplified for now)
class FastAnalytics {
  constructor(private db: D1Database) {}

  async getBasicMetrics() {
    try {
      // Check if orders table exists
      const tableCheck = await this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='orders'
      `).first();

      if (!tableCheck) {
        return {
          message: "No orders table found. Run sync first.",
          tables_available: await this.getAvailableTables()
        };
      }

      // First check if we have any orders at all
      const orderCount = await this.db.prepare(`
        SELECT COUNT(*) as count FROM orders
      `).first();
      
      console.log('Total orders in database:', orderCount?.count || 0);
      
      // Get all unique statuses to debug
      const statuses = await this.db.prepare(`
        SELECT DISTINCT status FROM orders LIMIT 10
      `).all();
      
      console.log('Order statuses found:', statuses.results.map(s => s.status));
      
      const metrics = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT contact_id) as unique_customers
        FROM orders
        WHERE status IN ('paid', 'completed', 'Paid', 'PAID', 'Completed', 'COMPLETED')
      `).first();

      // Get additional metrics from new tables
      const contactCount = await this.db.prepare(`
        SELECT COUNT(*) as total_contacts FROM contacts
      `).first();

      const productCount = await this.db.prepare(`
        SELECT COUNT(*) as total_products FROM products
      `).first();

      const subscriptionMetrics = await this.db.prepare(`
        SELECT 
          COUNT(*) as active_subscriptions,
          SUM(billing_amount) as monthly_recurring_revenue
        FROM subscriptions
        WHERE status = 'active'
      `).first();

      return {
        orders: metrics,
        contacts: contactCount,
        products: productCount,
        subscriptions: subscriptionMetrics,
        summary: {
          total_revenue: metrics?.total_revenue || 0,
          total_customers: contactCount?.total_contacts || 0,
          mrr: subscriptionMetrics?.monthly_recurring_revenue || 0
        }
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return { error: error.message };
    }
  }

  async getAvailableTables() {
    try {
      const tables = await this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();
      return tables.results.map(t => t.name);
    } catch (error) {
      return [];
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const keapClient = new KeapAPIClient(env.KEAP_SERVICE_ACCOUNT_KEY);
    const db = env.DB || db; // Use DB first, fallback to DB01
    const analytics = new FastAnalytics(db);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (url.pathname) {
        case '/':
          return new Response(generateMainDashboard(), {
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
          });

        case '/keap-orders':
          // Original endpoint - fetch live from Keap API
          const orders = await keapClient.fetchOrders(100); // Limit for speed
          return new Response(JSON.stringify({
            orders: orders,
            count: orders.length,
            fetched_at: new Date().toISOString()
          }, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case '/api/metrics':
          try {
            const cache = new CacheService(env.CACHE);
            const cacheKey = CacheKeys.metrics();
            
            // Try to get from cache first
            const cachedMetrics = await cache.get(cacheKey);
            if (cachedMetrics) {
              return new Response(JSON.stringify({
                ...cachedMetrics,
                _cached: true,
                _cachedAt: new Date().toISOString()
              }, null, 2), {
                headers: { 
                  ...corsHeaders, 
                  'Content-Type': 'application/json',
                  'X-Cache': 'HIT'
                }
              });
            }
            
            // Get fresh metrics
            const metrics = await analytics.getBasicMetrics();
            
            // Cache for 5 minutes
            await cache.set(cacheKey, metrics, { ttl: CacheTTL.MEDIUM });
            
            return new Response(JSON.stringify({
              ...metrics,
              _cached: false
            }, null, 2), {
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'X-Cache': 'MISS'
              }
            });
          } catch (error) {
            console.error('Metrics error:', error);
            // Fallback to non-cached version
            const metrics = await analytics.getBasicMetrics();
            return new Response(JSON.stringify(metrics, null, 2), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync-all-orders':
          // Sync ALL orders from Keap to Supabase (not just first 1000)
          try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Supabase credentials not configured');
            }

            // Fetch ALL orders from Keap using pagination
            const keapOrders = await keapClient.fetchAllOrders();
            console.log(`Fetched ${keapOrders.length} total orders from Keap`);

            // Process in batches of 500 to avoid payload size issues
            const batchSize = 500;
            let totalSynced = 0;

            for (let i = 0; i < keapOrders.length; i += batchSize) {
              const batch = keapOrders.slice(i, i + batchSize);

              // Transform batch for Supabase
              const supabaseBatch = batch.map(order => ({
                keap_order_id: order.id?.toString(),
                title: order.title || order.order_title || 'No Title',
                status: order.status || order.payment_status || 'unknown',
                total: parseFloat(order.total || order.order_total || 0),
                order_type: order.order_type || 'standard',
                creation_date: order.creation_date || order.order_date || new Date().toISOString(),
                order_date: order.order_date || order.creation_date || new Date().toISOString(),
                contact: order.contact || {
                  id: order.contact_id,
                  email: 'unknown@example.com',
                  first_name: 'Unknown',
                  last_name: 'Customer',
                  company_name: ''
                },
                order_items: order.order_items || [],
                shipping_information: order.shipping_information || null
              }));

              // Send batch to Supabase
              const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/keap_orders`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(supabaseBatch)
              });

              const responseText = await supabaseResponse.text();

              if (supabaseResponse.ok || supabaseResponse.status === 409) {
                totalSynced += batch.length;
                console.log(`Synced batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(keapOrders.length/batchSize)}: ${batch.length} orders`);
              } else {
                console.error(`Failed to sync batch: ${responseText}`);
              }
            }

            return new Response(JSON.stringify({
              success: true,
              message: `Successfully synced ${totalSynced} orders to Supabase`,
              synced: totalSynced,
              totalFetched: keapOrders.length,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Order sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync-orders':
          // Sync orders directly from Keap to Supabase
          try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Supabase credentials not configured');
            }

            // Fetch orders from Keap
            const keapOrders = await keapClient.fetchOrders(1000);
            console.log(`Fetched ${keapOrders.length} orders from Keap`);

            // Transform orders for Supabase
            const supabaseOrders = keapOrders.map(order => ({
              keap_order_id: order.id?.toString(),
              title: order.title || order.order_title || 'No Title',
              status: order.status || order.payment_status || 'unknown',
              total: parseFloat(order.total || order.order_total || 0),
              order_type: order.order_type || 'standard',
              creation_date: order.creation_date || order.order_date || new Date().toISOString(),
              order_date: order.order_date || order.creation_date || new Date().toISOString(),
              contact: order.contact || {
                id: order.contact_id,
                email: 'unknown@example.com',
                first_name: 'Unknown',
                last_name: 'Customer',
                company_name: ''
              },
              order_items: order.order_items || [],
              shipping_information: order.shipping_information || null
            }));

            // Use UPSERT via POST with proper headers for Supabase
            const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/keap_orders?on_conflict=keap_order_id`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify(supabaseOrders)
            });

            const responseText = await supabaseResponse.text();
            console.log('Supabase response:', supabaseResponse.status, responseText);

            if (!supabaseResponse.ok) {
              // If table doesn't exist, create it first
              if (responseText.includes('relation') && responseText.includes('does not exist')) {
                console.log('Table does not exist, creating...');

                // Create table via SQL function
                const createTableResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    sql: `CREATE TABLE IF NOT EXISTS keap_orders (
                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                      keap_order_id TEXT UNIQUE NOT NULL,
                      title TEXT,
                      status TEXT,
                      total DECIMAL(10,2),
                      order_type TEXT,
                      creation_date TIMESTAMP WITH TIME ZONE,
                      order_date TIMESTAMP WITH TIME ZONE,
                      contact JSONB,
                      order_items JSONB DEFAULT '[]'::JSONB,
                      shipping_information JSONB,
                      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )`
                  })
                });

                if (!createTableResponse.ok) {
                  const createError = await createTableResponse.text();
                  throw new Error(`Failed to create table: ${createError}`);
                }

                // Retry the insert
                const retryResponse = await fetch(`${supabaseUrl}/rest/v1/keap_orders`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=minimal'
                  },
                  body: JSON.stringify(supabaseOrders)
                });

                if (!retryResponse.ok) {
                  const retryError = await retryResponse.text();
                  throw new Error(`Failed after creating table: ${retryError}`);
                }
              } else {
                throw new Error(`Supabase sync failed: ${responseText}`);
              }
            }

            const result = {
              synced: supabaseOrders.length
            };

            return new Response(JSON.stringify({
              success: true,
              message: `Successfully synced ${result.synced} orders to Supabase`,
              ...result,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Order sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync-all-contacts':
          // Sync ALL contacts from Keap to Supabase (not just first 1000)
          try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Supabase credentials not configured');
            }

            // Fetch ALL contacts from Keap using pagination
            const keapContacts = await keapClient.fetchAllContacts();
            console.log(`Fetched ${keapContacts.length} total contacts from Keap`);

            // Process in batches of 500 to avoid payload size issues
            const batchSize = 500;
            let totalSynced = 0;

            for (let i = 0; i < keapContacts.length; i += batchSize) {
              const batch = keapContacts.slice(i, i + batchSize);

              // Transform batch for Supabase
              const supabaseBatch = batch.map(contact => ({
                keap_contact_id: contact.id?.toString(),
                email: contact.email_addresses?.[0]?.email || null,
                first_name: contact.given_name || contact.first_name || '',
                last_name: contact.family_name || contact.last_name || '',
                company_name: contact.company?.company_name || '',
                phone: contact.phone_numbers?.[0]?.number || null,
                date_created: contact.date_created || new Date().toISOString(),
                last_updated: contact.last_updated || new Date().toISOString(),
                tag_ids: contact.tag_ids || [],
                custom_fields: contact.custom_fields || {},
                addresses: contact.addresses || []
              }));

              // Send batch to Supabase
              const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/keap_customers`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(supabaseBatch)
              });

              const responseText = await supabaseResponse.text();

              if (supabaseResponse.ok || supabaseResponse.status === 409) {
                totalSynced += batch.length;
                console.log(`Synced batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(keapContacts.length/batchSize)}: ${batch.length} contacts`);
              } else {
                console.error(`Failed to sync batch: ${responseText}`);
              }
            }

            return new Response(JSON.stringify({
              success: true,
              message: `Successfully synced ${totalSynced} contacts to Supabase`,
              synced: totalSynced,
              totalFetched: keapContacts.length,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Contact sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync-customers':
          // Sync customers (contacts) from Keap to Supabase
          try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Supabase credentials not configured');
            }

            // Fetch contacts from Keap
            const keapContacts = await keapClient.fetchContacts(1000);
            console.log(`Fetched ${keapContacts.length} contacts from Keap`);

            // Transform contacts for Supabase
            const supabaseCustomers = keapContacts.map(contact => ({
              keap_contact_id: contact.id?.toString(),
              email: contact.email_addresses?.[0]?.email || null,
              first_name: contact.given_name || contact.first_name || '',
              last_name: contact.family_name || contact.last_name || '',
              company_name: contact.company?.company_name || '',
              phone: contact.phone_numbers?.[0]?.number || null,
              date_created: contact.date_created || new Date().toISOString(),
              last_updated: contact.last_updated || new Date().toISOString(),
              tag_ids: contact.tag_ids || [],
              custom_fields: contact.custom_fields || {},
              addresses: contact.addresses || []
            }));

            // Use direct REST API call to Supabase
            const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/keap_customers`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify(supabaseCustomers)
            });

            const responseText = await supabaseResponse.text();
            console.log('Supabase customers response:', supabaseResponse.status, responseText);

            if (!supabaseResponse.ok && responseText.includes('does not exist')) {
              throw new Error('Table keap_customers does not exist. Please create it first using the provided SQL schema.');
            }

            return new Response(JSON.stringify({
              success: true,
              message: `Successfully synced ${supabaseCustomers.length} customers to Supabase`,
              synced: supabaseCustomers.length,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Customer sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync-products':
          // Sync products from Keap to Supabase
          try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Supabase credentials not configured');
            }

            // Fetch products from Keap
            const keapProducts = await keapClient.fetchProducts(1000);
            console.log(`Fetched ${keapProducts.length} products from Keap`);

            // Transform products for Supabase
            const supabaseProducts = keapProducts.map(product => ({
              keap_product_id: product.id?.toString(),
              product_name: product.product_name || product.name || 'Unknown Product',
              product_desc: product.product_desc || product.description || '',
              product_price: parseFloat(product.product_price || product.price || 0),
              product_short_desc: product.product_short_desc || '',
              subscription_only: product.subscription_only || false,
              sku: product.sku || '',
              status: product.status || 1,
              subscription_plans: product.subscription_plans || [],
              product_options: product.product_options || []
            }));

            // Use direct REST API call to Supabase
            const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/keap_products`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify(supabaseProducts)
            });

            const responseText = await supabaseResponse.text();
            console.log('Supabase products response:', supabaseResponse.status, responseText);

            if (!supabaseResponse.ok && responseText.includes('does not exist')) {
              throw new Error('Table keap_products does not exist. Please create it first using the provided SQL schema.');
            }

            return new Response(JSON.stringify({
              success: true,
              message: `Successfully synced ${supabaseProducts.length} products to Supabase`,
              synced: supabaseProducts.length,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Product sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync-subscriptions':
          // Sync subscriptions from Keap to Supabase
          try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Supabase credentials not configured');
            }

            // Fetch subscriptions from Keap
            const keapSubscriptions = await keapClient.fetchSubscriptions(1000);
            console.log(`Fetched ${keapSubscriptions.length} subscriptions from Keap`);

            // Transform subscriptions for Supabase
            const supabaseSubscriptions = keapSubscriptions.map(sub => ({
              keap_subscription_id: sub.id?.toString(),
              contact_id: sub.contact_id?.toString() || '',
              product_id: sub.product_id?.toString() || '',
              program_id: sub.program_id?.toString() || '',
              billing_cycle: sub.billing_cycle || sub.cycle || '',
              frequency: sub.frequency || 1,
              billing_amount: parseFloat(sub.billing_amount || sub.subscription_plan?.price || 0),
              status: sub.status || 'UNKNOWN',
              start_date: sub.start_date || sub.next_bill_date || new Date().toISOString(),
              end_date: sub.end_date || null,
              next_bill_date: sub.next_bill_date || null,
              payment_gateway: sub.payment_gateway?.name || '',
              credit_card_id: sub.credit_card_id?.toString() || '',
              auto_charge: sub.auto_charge !== false,
              subscription_plan_id: sub.subscription_plan_id?.toString() || ''
            }));

            // Use direct REST API call to Supabase
            const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/keap_subscriptions`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify(supabaseSubscriptions)
            });

            const responseText = await supabaseResponse.text();
            console.log('Supabase subscriptions response:', supabaseResponse.status, responseText);

            if (!supabaseResponse.ok && responseText.includes('does not exist')) {
              throw new Error('Table keap_subscriptions does not exist. Please create it first using the provided SQL schema.');
            }

            return new Response(JSON.stringify({
              success: true,
              message: `Successfully synced ${supabaseSubscriptions.length} subscriptions to Supabase`,
              synced: supabaseSubscriptions.length,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Subscription sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync-all':
          // Sync all data types from Keap to Supabase
          try {
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              throw new Error('Supabase credentials not configured');
            }

            const results = {
              orders: { synced: 0, error: null },
              customers: { synced: 0, error: null },
              products: { synced: 0, error: null },
              subscriptions: { synced: 0, error: null }
            };

            // Sync Orders
            try {
              const orders = await keapClient.fetchOrders(1000);
              const transformedOrders = orders.map(order => ({
                keap_order_id: order.id?.toString(),
                title: order.title || order.order_title || 'No Title',
                status: order.status || order.payment_status || 'unknown',
                total: parseFloat(order.total || order.order_total || 0),
                order_type: order.order_type || 'standard',
                creation_date: order.creation_date || order.order_date || new Date().toISOString(),
                order_date: order.order_date || order.creation_date || new Date().toISOString(),
                contact: order.contact || { id: order.contact_id },
                order_items: order.order_items || [],
                shipping_information: order.shipping_information || null
              }));

              const ordersResponse = await fetch(`${supabaseUrl}/rest/v1/keap_orders`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(transformedOrders)
              });

              if (ordersResponse.ok) {
                results.orders.synced = transformedOrders.length;
              } else {
                results.orders.error = `Failed: ${ordersResponse.status}`;
              }
            } catch (error) {
              results.orders.error = error.message;
            }

            // Sync Customers
            try {
              const contacts = await keapClient.fetchContacts(1000);
              const transformedCustomers = contacts.map(contact => ({
                keap_contact_id: contact.id?.toString(),
                email: contact.email_addresses?.[0]?.email || null,
                first_name: contact.given_name || contact.first_name || '',
                last_name: contact.family_name || contact.last_name || '',
                company_name: contact.company?.company_name || '',
                phone: contact.phone_numbers?.[0]?.number || null,
                date_created: contact.date_created || new Date().toISOString(),
                last_updated: contact.last_updated || new Date().toISOString(),
                tag_ids: contact.tag_ids || [],
                custom_fields: contact.custom_fields || {},
                addresses: contact.addresses || []
              }));

              const customersResponse = await fetch(`${supabaseUrl}/rest/v1/keap_customers`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(transformedCustomers)
              });

              if (customersResponse.ok) {
                results.customers.synced = transformedCustomers.length;
              } else {
                results.customers.error = `Failed: ${customersResponse.status}`;
              }
            } catch (error) {
              results.customers.error = error.message;
            }

            // Sync Products
            try {
              const products = await keapClient.fetchProducts(1000);
              const transformedProducts = products.map(product => ({
                keap_product_id: product.id?.toString(),
                product_name: product.product_name || product.name || 'Unknown Product',
                product_desc: product.product_desc || product.description || '',
                product_price: parseFloat(product.product_price || product.price || 0),
                product_short_desc: product.product_short_desc || '',
                subscription_only: product.subscription_only || false,
                sku: product.sku || '',
                status: product.status || 1,
                subscription_plans: product.subscription_plans || [],
                product_options: product.product_options || []
              }));

              const productsResponse = await fetch(`${supabaseUrl}/rest/v1/keap_products`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(transformedProducts)
              });

              if (productsResponse.ok) {
                results.products.synced = transformedProducts.length;
              } else {
                results.products.error = `Failed: ${productsResponse.status}`;
              }
            } catch (error) {
              results.products.error = error.message;
            }

            // Sync Subscriptions
            try {
              const subscriptions = await keapClient.fetchSubscriptions(1000);
              const transformedSubs = subscriptions.map(sub => ({
                keap_subscription_id: sub.id?.toString(),
                contact_id: sub.contact_id?.toString() || '',
                product_id: sub.product_id?.toString() || '',
                program_id: sub.program_id?.toString() || '',
                billing_cycle: sub.billing_cycle || sub.cycle || '',
                frequency: sub.frequency || 1,
                billing_amount: parseFloat(sub.billing_amount || sub.subscription_plan?.price || 0),
                status: sub.status || 'UNKNOWN',
                start_date: sub.start_date || sub.next_bill_date || new Date().toISOString(),
                end_date: sub.end_date || null,
                next_bill_date: sub.next_bill_date || null,
                payment_gateway: sub.payment_gateway?.name || '',
                credit_card_id: sub.credit_card_id?.toString() || '',
                auto_charge: sub.auto_charge !== false,
                subscription_plan_id: sub.subscription_plan_id?.toString() || ''
              }));

              const subsResponse = await fetch(`${supabaseUrl}/rest/v1/keap_subscriptions`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify(transformedSubs)
              });

              if (subsResponse.ok) {
                results.subscriptions.synced = transformedSubs.length;
              } else {
                results.subscriptions.error = `Failed: ${subsResponse.status}`;
              }
            } catch (error) {
              results.subscriptions.error = error.message;
            }

            const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0);
            const hasErrors = Object.values(results).some(r => r.error);

            return new Response(JSON.stringify({
              success: !hasErrors,
              message: `Synced ${totalSynced} total records to Supabase`,
              results,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Full sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/tables':
          // List all tables in the database
          const tableList = await db.prepare(`
            SELECT name, sql FROM sqlite_master WHERE type='table'
          `).all();
          
          return new Response(JSON.stringify({
            tables: tableList.results,
            count: tableList.results.length
          }, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case '/api/migrate':
          // Migrate to new database schema
          try {
            // First check current state
            const checkTables = await db.prepare(`
              SELECT name FROM sqlite_master WHERE type='table'
            `).all();
            
            const currentTables = checkTables.results.map(t => t.name);
            
            // Determine migration status
            const hasNewSchema = currentTables.includes('companies');
            const hasOrdersNew = currentTables.includes('orders_new');
            const hasOrdersLower = currentTables.includes('orders');
            const hasOrdersUpper = currentTables.includes('Orders');
            
            // If migration is complete, return success
            if (hasNewSchema && hasOrdersLower && !hasOrdersNew && !hasOrdersUpper) {
              return new Response(JSON.stringify({ 
                success: true, 
                message: 'Migration already completed',
                tables: currentTables
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            
            // If we need to complete the migration (have orders_new)
            if (hasNewSchema && hasOrdersNew) {
              // Drop any existing orders tables
              if (hasOrdersUpper) {
                await db.prepare('DROP TABLE Orders').run();
              }
              if (hasOrdersLower) {
                await db.prepare('DROP TABLE orders').run();
              }
              
              // Rename orders_new to orders
              await db.prepare('ALTER TABLE orders_new RENAME TO orders').run();
              
              return new Response(JSON.stringify({ 
                success: true, 
                message: 'Migration completed - renamed orders_new to orders',
                previousTables: currentTables
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            
            // Otherwise, create schema from scratch
            const schemaSQL = `
              CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                name TEXT NOT NULL,
                keap_app_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT REFERENCES companies(id),
                keap_contact_id TEXT UNIQUE,
                email TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                tags TEXT DEFAULT '[]',
                custom_fields TEXT DEFAULT '{}',
                lifecycle_stage TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT REFERENCES companies(id),
                keap_product_id TEXT UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2),
                category TEXT,
                sku TEXT,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE IF NOT EXISTS orders_new (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT REFERENCES companies(id),
                keap_order_id TEXT UNIQUE,
                contact_id TEXT REFERENCES contacts(id),
                total_amount DECIMAL(10,2),
                status TEXT,
                order_date DATETIME,
                products TEXT DEFAULT '[]',
                shipping_address TEXT DEFAULT '{}',
                billing_address TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT REFERENCES companies(id),
                keap_subscription_id TEXT UNIQUE,
                contact_id TEXT REFERENCES contacts(id),
                product_id TEXT REFERENCES products(id),
                status TEXT,
                billing_amount DECIMAL(10,2),
                billing_cycle TEXT,
                start_date DATETIME,
                next_billing_date DATETIME,
                end_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE IF NOT EXISTS sync_logs (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT REFERENCES companies(id),
                sync_type TEXT NOT NULL,
                status TEXT NOT NULL,
                records_processed INTEGER DEFAULT 0,
                errors TEXT DEFAULT '[]',
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
              );
            `;

            // Create tables one by one (D1 doesn't support multi-statement exec well)
            await db.prepare(`
              CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                name TEXT NOT NULL,
                keap_app_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `).run();

            await db.prepare(`
              CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT,
                keap_contact_id TEXT UNIQUE,
                email TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                tags TEXT DEFAULT '[]',
                custom_fields TEXT DEFAULT '{}',
                lifecycle_stage TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `).run();

            await db.prepare(`
              CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT,
                keap_product_id TEXT UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2),
                category TEXT,
                sku TEXT,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `).run();

            await db.prepare(`
              CREATE TABLE IF NOT EXISTS orders_new (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT,
                keap_order_id TEXT UNIQUE,
                contact_id TEXT,
                total_amount DECIMAL(10,2),
                status TEXT,
                order_date DATETIME,
                products TEXT DEFAULT '[]',
                shipping_address TEXT DEFAULT '{}',
                billing_address TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `).run();

            await db.prepare(`
              CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT,
                keap_subscription_id TEXT UNIQUE,
                contact_id TEXT,
                product_id TEXT,
                status TEXT,
                billing_amount DECIMAL(10,2),
                billing_cycle TEXT,
                start_date DATETIME,
                next_billing_date DATETIME,
                end_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `).run();

            await db.prepare(`
              CREATE TABLE IF NOT EXISTS sync_logs (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                company_id TEXT,
                sync_type TEXT NOT NULL,
                status TEXT NOT NULL,
                records_processed INTEGER DEFAULT 0,
                errors TEXT DEFAULT '[]',
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
              )
            `).run();

            // Create indexes
            const indexStatements = [
              'CREATE INDEX IF NOT EXISTS idx_contacts_keap_id ON contacts(keap_contact_id)',
              'CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)',
              'CREATE INDEX IF NOT EXISTS idx_orders_contact_id ON orders_new(contact_id)',
              'CREATE INDEX IF NOT EXISTS idx_orders_date ON orders_new(order_date)',
              'CREATE INDEX IF NOT EXISTS idx_orders_keap_id ON orders_new(keap_order_id)',
              'CREATE INDEX IF NOT EXISTS idx_subscriptions_contact_id ON subscriptions(contact_id)',
              'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)',
              'CREATE INDEX IF NOT EXISTS idx_sync_logs_type_status ON sync_logs(sync_type, status)'
            ];

            for (const indexStmt of indexStatements) {
              await db.prepare(indexStmt).run();
            }

            // Create default company
            const defaultCompanyId = 'default-company';
            await db.prepare(`
              INSERT OR IGNORE INTO companies (id, name, keap_app_id) 
              VALUES (?, 'Nutrition Solutions', ?)
            `).bind(defaultCompanyId, env.KEAP_APP_ID || 'default').run();

            // Check what tables already exist
            const existingTables = await db.prepare(`
              SELECT name FROM sqlite_master WHERE type='table'
            `).all();
            
            const tableNames = existingTables.results.map(t => t.name);
            let migratedCount = 0;
            
            console.log('Existing tables:', tableNames);
            
            // Check if we need to migrate or if migration is already done
            if ((tableNames.includes('Orders') || tableNames.includes('orders')) && !tableNames.includes('companies')) {
              // Old schema exists, need to migrate
              const tableName = tableNames.includes('Orders') ? 'Orders' : 'orders';
              const existingOrders = await db.prepare(`SELECT * FROM ${tableName}`).all();
              for (const order of existingOrders.results) {
                // Create contact if needed
                const contactId = crypto.randomUUID();
                
                // Extract contact info from order
                const firstName = order.order_title?.split(' ')[0] || 'Unknown';
                const lastName = order.order_title?.split(' ').slice(1).join(' ') || '';
                
                await db.prepare(`
                  INSERT OR IGNORE INTO contacts (
                    id, company_id, keap_contact_id, first_name, last_name
                  ) VALUES (?, ?, ?, ?, ?)
                `).bind(
                  contactId,
                  defaultCompanyId,
                  order.contact_id?.toString() || 'unknown',
                  firstName,
                  lastName
                ).run();
                
                // Get actual contact ID
                const contact = await db.prepare(`
                  SELECT id FROM contacts WHERE keap_contact_id = ?
                `).bind(order.contact_id?.toString() || 'unknown').first();
                
                // Insert order into new table
                await db.prepare(`
                  INSERT OR IGNORE INTO orders_new (
                    company_id, keap_order_id, contact_id, 
                    total_amount, status, order_date, products
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                  defaultCompanyId,
                  order.id?.toString() || crypto.randomUUID(),
                  contact?.id || contactId,
                  order.order_total || 0,
                  order.payment_status || 'unknown',
                  order.order_date || new Date().toISOString(),
                  order.order_items || '[]'
                ).run();
                
                migratedCount++;
              }
              
              // Drop old orders table and rename new one
              await db.prepare(`DROP TABLE ${tableName}`).run();
              await db.prepare('ALTER TABLE orders_new RENAME TO orders').run();
              migratedCount = existingOrders.results.length;
            } else if (tableNames.includes('companies') && tableNames.includes('orders_new') && !tableNames.includes('orders')) {
              // Migration was partially completed, just rename orders_new to orders
              await db.prepare('ALTER TABLE orders_new RENAME TO orders').run();
            } else if (tableNames.includes('companies') && tableNames.includes('orders_new') && (tableNames.includes('Orders') || tableNames.includes('orders'))) {
              // We have both old and new tables, need to complete migration
              // Check if there's a lowercase 'orders' table too
              const hasLowerOrders = tableNames.includes('orders');
              const hasUpperOrders = tableNames.includes('Orders');
              
              // Drop all conflicting tables
              if (hasUpperOrders) {
                await db.prepare(`DROP TABLE Orders`).run();
              }
              if (hasLowerOrders) {
                await db.prepare(`DROP TABLE orders`).run();
              }
              
              // Now rename orders_new to orders
              await db.prepare('ALTER TABLE orders_new RENAME TO orders').run();
            } else if (tableNames.includes('companies') && tableNames.includes('orders') && !tableNames.includes('orders_new')) {
              // Migration already completed
              return new Response(JSON.stringify({ 
                success: true, 
                message: 'Migration already completed',
                existingTables: tableNames
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            // Log migration
            await db.prepare(`
              INSERT INTO sync_logs (company_id, sync_type, status, records_processed, completed_at)
              VALUES (?, 'database_migration', 'completed', ?, CURRENT_TIMESTAMP)
            `).bind(defaultCompanyId, migratedCount).run();

            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Database migration completed successfully',
              migratedOrders: migratedCount,
              tablesCreated: ['companies', 'contacts', 'products', 'orders', 'subscriptions', 'sync_logs']
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Migration error:', error);
            return new Response(JSON.stringify({ 
              success: false, 
              error: error.message,
              stack: error.stack
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync/contacts':
          // Sync contacts from Keap
          try {
            const keapClientV2 = new KeapClient({ serviceAccountKey: env.KEAP_SERVICE_ACCOUNT_KEY });
            const dataSync = new DataSync(keapClientV2, db);
            const cache = new CacheService(env.CACHE);
            
            const result = await dataSync.syncContacts();
            
            // Invalidate relevant caches
            await Promise.all([
              cache.deletePattern('metrics'),
              cache.deletePattern('dashboard'),
              cache.deletePattern('contacts')
            ]);
            
            return new Response(JSON.stringify({
              success: true,
              ...result
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Contact sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync/products':
          // Sync products from Keap
          try {
            const keapClientV2 = new KeapClient({ serviceAccountKey: env.KEAP_SERVICE_ACCOUNT_KEY });
            const dataSync = new DataSync(keapClientV2, db);
            
            const result = await dataSync.syncProducts();
            
            return new Response(JSON.stringify({
              success: true,
              ...result
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Product sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/sync/subscriptions':
          // Sync subscriptions from Keap
          try {
            const keapClientV2 = new KeapClient({ serviceAccountKey: env.KEAP_SERVICE_ACCOUNT_KEY });
            const dataSync = new DataSync(keapClientV2, db);
            
            const result = await dataSync.syncSubscriptions();
            
            return new Response(JSON.stringify({
              success: true,
              ...result
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Subscription sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/debug/db-status':
          // Debug endpoint to check database status
          const tables = await db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table'
          `).all();
          
          const tableStatus = {};
          for (const table of tables.results) {
            const count = await db.prepare(`
              SELECT COUNT(*) as count FROM ${table.name}
            `).first();
            tableStatus[table.name] = count?.count || 0;
          }
          
          return new Response(JSON.stringify({
            tables: tableStatus,
            timestamp: new Date().toISOString()
          }, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case '/api/sync/all':
          // Sync all data from Keap
          try {
            const keapClientV2 = new KeapClient({ serviceAccountKey: env.KEAP_SERVICE_ACCOUNT_KEY });
            const dataSync = new DataSync(keapClientV2, db);
            const cache = new CacheService(env.CACHE);
            
            const results = await dataSync.syncAll();
            
            // Clear all caches after full sync
            await Promise.all([
              cache.deletePattern('metrics'),
              cache.deletePattern('dashboard'),
              cache.deletePattern('contacts'),
              cache.deletePattern('orders'),
              cache.deletePattern('products'),
              cache.deletePattern('subscriptions')
            ]);
            
            return new Response(JSON.stringify({
              success: true,
              results,
              summary: {
                totalSynced: results.reduce((sum, r) => sum + r.synced, 0),
                totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
                totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
              }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Full sync error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/dashboard':
          // Get comprehensive dashboard data
          try {
            const cache = new CacheService(env.CACHE);
            const { searchParams } = new URL(request.url);
            const startDate = searchParams.get('start');
            const endDate = searchParams.get('end');
            const cacheKey = CacheKeys.dashboard(startDate || undefined, endDate || undefined);
            
            // Try cache first
            const cachedData = await cache.get(cacheKey);
            if (cachedData) {
              return new Response(JSON.stringify({
                ...cachedData,
                _cached: true,
                _cachedAt: new Date().toISOString()
              }), {
                headers: { 
                  ...corsHeaders, 
                  'Content-Type': 'application/json',
                  'X-Cache': 'HIT'
                }
              });
            }
            
            // Get fresh data
            const dashboardAnalytics = new DashboardAnalytics(db);
            const dashboardData = await dashboardAnalytics.getDashboardData(startDate, endDate);
            
            // Cache for 5 minutes
            await cache.set(cacheKey, dashboardData, { ttl: CacheTTL.MEDIUM });
            
            return new Response(JSON.stringify({
              ...dashboardData,
              _cached: false
            }), {
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'X-Cache': 'MISS'
              }
            });
          } catch (error) {
            console.error('Dashboard data error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/dashboard':
          // Serve the improved dashboard HTML
          return new Response(await db.prepare('SELECT 1').first() ? '' : '', {
            status: 301,
            headers: {
              ...corsHeaders,
              'Location': '/dashboard-v2.html'
            }
          });

        case '/api/webhooks/register':
          // Register webhooks with Keap
          if (request.method !== 'POST') {
            return new Response('Method not allowed', {
              status: 405,
              headers: corsHeaders
            });
          }

          try {
            const { registerKeapWebhooks } = await import('./keap-webhooks');

            // Get the webhook URL from request or use default
            const requestData = await request.json().catch(() => ({}));
            const webhookUrl = requestData.webhookUrl || 'https://d1-starter-sessions-api.megan-d14.workers.dev/api/webhooks/keap';

            // Register all webhooks
            const webhooks = await registerKeapWebhooks(env.KEAP_SERVICE_ACCOUNT_KEY, webhookUrl);

            return new Response(JSON.stringify({
              success: true,
              message: `Registered ${webhooks.length} webhooks with Keap`,
              webhooks: webhooks,
              webhookUrl: webhookUrl
            }, null, 2), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Failed to register webhooks:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message,
              note: 'Make sure your Keap Service Account Key has webhook permissions'
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        // Real-time dashboard data endpoints using Supabase through Hyperdrive
        case '/api/dashboard/revenue':
          try {
            if (!env.HYPERDRIVE) {
              throw new Error('Hyperdrive not configured');
            }
            
            const { Client } = await import('pg');
            const client = new Client({
              connectionString: env.HYPERDRIVE.connectionString,
            });
            
            await client.connect();
            
            const { searchParams } = new URL(request.url);
            const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
            
            // Daily revenue query
            const revenueQuery = `
              SELECT 
                DATE(order_date) as date,
                SUM(total_amount) as revenue,
                COUNT(*) as order_count
              FROM orders
              WHERE order_date >= $1 AND order_date <= $2
                AND status IN ('paid', 'completed', 'Paid', 'PAID', 'Completed', 'COMPLETED')
              GROUP BY DATE(order_date)
              ORDER BY date DESC
            `;
            
            const results = await client.query(revenueQuery, [startDate, endDate]);
            await client.end();
            
            return new Response(JSON.stringify({
              success: true,
              data: results.rows || [],
              period: { start: startDate, end: endDate }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Revenue data error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/dashboard/orders':
          try {
            if (!env.HYPERDRIVE) {
              throw new Error('Hyperdrive not configured');
            }
            
            const { Client } = await import('pg');
            const client = new Client({
              connectionString: env.HYPERDRIVE.connectionString,
            });
            
            await client.connect();
            
            // Order status distribution
            const statusQuery = `
              SELECT 
                status,
                COUNT(*) as count,
                SUM(total_amount) as total_value
              FROM orders
              WHERE order_date >= NOW() - INTERVAL '30 days'
              GROUP BY status
            `;
            
            const statusResults = await client.query(statusQuery);
            
            // Recent orders
            const recentQuery = `
              SELECT 
                o.keap_order_id as id,
                o.contact_name as customer,
                o.order_date as date,
                o.total_amount as amount,
                o.status
              FROM orders o
              ORDER BY o.order_date DESC
              LIMIT 10
            `;
            
            const recentResults = await client.query(recentQuery);
            await client.end();
            
            return new Response(JSON.stringify({
              success: true,
              statusDistribution: statusResults.rows || [],
              recentOrders: recentResults.rows || []
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Orders data error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/dashboard/customers':
          try {
            if (!env.HYPERDRIVE) {
              throw new Error('Hyperdrive not configured');
            }
            
            const { Client } = await import('pg');
            const client = new Client({
              connectionString: env.HYPERDRIVE.connectionString,
            });
            
            await client.connect();
            const { searchParams } = new URL(request.url);
            const days = parseInt(searchParams.get('days') || '7');
            
            // Customer growth by day
            const growthQuery = `
              SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_customers
              FROM contacts
              WHERE created_at >= NOW() - INTERVAL '${days} days'
              GROUP BY DATE(created_at)
              ORDER BY date DESC
            `;
            
            const results = await client.query(growthQuery);
            await client.end();
            
            return new Response(JSON.stringify({
              success: true,
              data: results.rows || [],
              period: days
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Customers data error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/dashboard/products':
          try {
            if (!env.HYPERDRIVE) {
              throw new Error('Hyperdrive not configured');
            }
            
            const { Client } = await import('pg');
            const client = new Client({
              connectionString: env.HYPERDRIVE.connectionString,
            });
            
            await client.connect();
            
            // Top products by revenue
            const productsQuery = `
              SELECT 
                p.name as product_name,
                COUNT(DISTINCT o.keap_order_id) as order_count,
                SUM(o.total_amount) as total_revenue
              FROM orders o
              JOIN products p ON p.keap_product_id = ANY(
                SELECT jsonb_array_elements(o.products::jsonb)->>'product_id'
              )
              WHERE o.order_date >= NOW() - INTERVAL '30 days'
                AND o.status IN ('paid', 'completed', 'Paid', 'PAID', 'Completed', 'COMPLETED')
              GROUP BY p.name
              ORDER BY total_revenue DESC
              LIMIT 10
            `;
            
            const results = await client.query(productsQuery);
            await client.end();
            
            return new Response(JSON.stringify({
              success: true,
              data: results.rows || []
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Products data error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/dashboard/subscriptions':
          try {
            if (!env.HYPERDRIVE) {
              throw new Error('Hyperdrive not configured');
            }
            
            const { Client } = await import('pg');
            const client = new Client({
              connectionString: env.HYPERDRIVE.connectionString,
            });
            
            await client.connect();
            
            // Active subscriptions and MRR
            const subsQuery = `
              SELECT 
                COUNT(*) FILTER (WHERE status = 'active') as active_count,
                SUM(billing_amount) FILTER (WHERE status = 'active') as mrr,
                COUNT(*) FILTER (WHERE status = 'paused') as paused_count,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
              FROM subscriptions
            `;
            
            const results = await client.query(subsQuery);
            
            // Recent subscriptions
            const recentQuery = `
              SELECT 
                contact_name as customer,
                product_name as product,
                billing_amount as amount,
                billing_cycle as cycle,
                next_bill_date,
                status
              FROM subscriptions
              WHERE status = 'active'
              ORDER BY created_at DESC
              LIMIT 10
            `;
            
            const recentResults = await client.query(recentQuery);
            await client.end();
            
            return new Response(JSON.stringify({
              success: true,
              metrics: results.rows[0] || {},
              recentSubscriptions: recentResults.rows || []
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Subscriptions data error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case '/api/webhooks/keap':
          // Handle Keap webhooks for real-time updates
          if (request.method !== 'POST') {
            return new Response('Method not allowed', {
              status: 405,
              headers: corsHeaders
            });
          }

          try {
            const { KeapWebhookHandler, KeapWebhookPayload } = await import('./keap-webhooks');
            const payload = await request.json() as KeapWebhookPayload;
            console.log('Received webhook:', payload);

            // Initialize webhook handler
            const webhookHandler = new KeapWebhookHandler({
              supabaseUrl: env.SUPABASE_URL!,
              supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY!,
              keapServiceKey: env.KEAP_SERVICE_ACCOUNT_KEY
            });

            // Process webhook
            await webhookHandler.handleWebhook(payload);

            return new Response(JSON.stringify({
              success: true,
              message: 'Webhook processed successfully'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Webhook error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        default:
          return new Response(JSON.stringify({ error: 'Not Found', available_endpoints: [
            '/',
            '/dashboard',
            '/keap-orders',
            '/api/metrics',
            '/api/sync-orders',
            '/api/sync-customers',
            '/api/sync-products',
            '/api/sync-subscriptions',
            '/api/sync-all',
            '/api/migrate',
            '/api/tables',
            '/api/sync/contacts',
            '/api/sync/products',
            '/api/sync/subscriptions',
            '/api/sync/all',
            '/api/webhooks/keap',
            '/api/dashboard',
            '/api/dashboard/revenue',
            '/api/dashboard/orders',
            '/api/dashboard/customers',
            '/api/dashboard/products',
            '/api/dashboard/subscriptions',
            '/api/webhooks/keap',
            '/api/webhooks/register'
          ] }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        endpoint: url.pathname
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

function generateMainDashboard(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Nutrition Solutions Data Hub</title>
    <style>
        body { font-family: system-ui; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .endpoints { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .endpoint { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .endpoint h3 { color: #333; margin-bottom: 15px; }
        .endpoint p { color: #666; margin-bottom: 15px; }
        .btn { background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .btn:hover { background: #5a6fd8; }
        .status { padding: 10px; background: #e8f5e8; border: 1px solid #4caf50; border-radius: 5px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Nutrition Solutions Data Hub</h1>
            <p>Your unified data platform - Lightning fast analytics & AI-powered insights</p>
            <div style="margin-top: 20px;">
                <a href="/dashboard" class="btn" style="background: white; color: #667eea; padding: 12px 30px; font-size: 18px; font-weight: 600; border-radius: 8px; text-decoration: none; display: inline-block;">
                    📊 View Analytics Dashboard
                </a>
            </div>
        </div>
        
        <div class="endpoints">
            <div class="endpoint">
                <h3>📊 Live Keap Orders</h3>
                <p>Real-time order data directly from Keap API</p>
                <a href="/keap-orders" class="btn">View Orders JSON</a>
                <div class="status">✅ Fixed endpoint - should work now!</div>
            </div>
            
            <div class="endpoint">
                <h3>⚡ Sync to Database</h3>
                <p>Import Keap orders into D1 for lightning-fast analytics</p>
                <a href="/api/sync-orders" class="btn">Sync Orders</a>
                <div class="status">🔄 Creates local copy for speed</div>
            </div>
            
            <div class="endpoint">
                <h3>📈 Analytics Metrics</h3>
                <p>Business intelligence from your local database</p>
                <a href="/api/metrics" class="btn">View Metrics</a>
                <div class="status">💡 Replaces Grow.com functionality</div>
            </div>
            
            <div class="endpoint">
                <h3>🔧 Database Migration</h3>
                <p>Upgrade to new schema with contacts, products & subscriptions</p>
                <a href="/api/migrate" class="btn">Run Migration</a>
                <div class="status">🆕 One-time setup for full functionality</div>
            </div>
        </div>
        
        <h2 style="margin-top: 40px; color: #333;">🔄 Data Sync Operations</h2>
        <div class="endpoints">
            <div class="endpoint">
                <h3>👥 Sync Contacts</h3>
                <p>Import all contacts from Keap CRM</p>
                <a href="/api/sync/contacts" class="btn">Sync Contacts</a>
                <div class="status">Import customer data</div>
            </div>
            
            <div class="endpoint">
                <h3>📦 Sync Products</h3>
                <p>Import product catalog from Keap</p>
                <a href="/api/sync/products" class="btn">Sync Products</a>
                <div class="status">Import product data</div>
            </div>
            
            <div class="endpoint">
                <h3>🔁 Sync Subscriptions</h3>
                <p>Import subscription data from Keap</p>
                <a href="/api/sync/subscriptions" class="btn">Sync Subscriptions</a>
                <div class="status">Import recurring revenue</div>
            </div>
            
            <div class="endpoint">
                <h3>🚀 Full Sync</h3>
                <p>Sync all data types in one operation</p>
                <a href="/api/sync/all" class="btn">Sync Everything</a>
                <div class="status">Complete data import</div>
            </div>
        </div>
        
        <div style="background: white; padding: 25px; border-radius: 10px; margin-top: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3>🎯 Next Steps</h3>
            <ol>
                <li><strong>Test the fix:</strong> Click "View Orders JSON" above</li>
                <li><strong>Sync your data:</strong> Click "Sync Orders" to create local copy</li>
                <li><strong>View analytics:</strong> Click "View Metrics" to see your dashboard</li>
                <li><strong>Scale up:</strong> Ready to replace Grow.com and save $3,400/month</li>
            </ol>
        </div>
    </div>
</body>
</html>
  `;
}