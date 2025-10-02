/**
 * Keap API Integration Examples
 * Practical examples of using the Keap API client and utilities
 */

import { KeapClientEnhanced } from './keap-client-enhanced';
import {
  KeapContact,
  KeapOrder,
  KeapSubscription,
  KeapLifecycleStage,
  KeapOrderStatus,
  KeapSubscriptionStatus,
  KeapBillingCycle,
} from './keap-types';
import * as utils from './keap-utils';

// ============================================
// Client Initialization Examples
// ============================================

// Example 1: Initialize with API Key
const clientWithApiKey = new KeapClientEnhanced({
  apiKey: process.env.KEAP_API_KEY!,
  debug: true,
  enableCache: true,
  cacheTTL: 300000, // 5 minutes
});

// Example 2: Initialize with OAuth Token
const clientWithOAuth = new KeapClientEnhanced({
  accessToken: process.env.KEAP_ACCESS_TOKEN!,
  refreshToken: process.env.KEAP_REFRESH_TOKEN!,
  clientId: process.env.KEAP_CLIENT_ID!,
  clientSecret: process.env.KEAP_CLIENT_SECRET!,
  maxRetries: 3,
  retryOnRateLimit: true,
});

// ============================================
// Contact Management Examples
// ============================================

/**
 * Example: Create a new contact with full details
 */
async function createContactExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  const newContact = await client.createContact({
    given_name: 'John',
    family_name: 'Doe',
    email_addresses: [
      {
        email: 'john.doe@example.com',
        is_primary: true,
        is_opted_in: true,
      },
    ],
    phone_numbers: [
      {
        number: '555-1234',
        type: 'MOBILE',
        is_primary: true,
      },
    ],
    addresses: [
      {
        line1: '123 Main St',
        locality: 'Anytown',
        region: 'CA',
        postal_code: '12345',
        country_code: 'US',
      },
    ],
    lifecycle_stage: KeapLifecycleStage.LEAD,
    lead_source: 'Website',
    custom_fields: [
      { id: 'custom_field_1', content: 'Custom Value' },
    ],
  });

  console.log('Created contact:', utils.formatContactName(newContact));
  return newContact;
}

/**
 * Example: Search and filter contacts
 */
async function searchContactsExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Get all contacts with pagination
  const allContacts = await utils.fetchAllPages<KeapContact>(
    (offset) => client.getContacts({ limit: 100, offset })
  );

  // Filter by lifecycle stage
  const leads = utils.filterContactsByStage(allContacts, KeapLifecycleStage.LEAD);

  // Search by text
  const searchResults = utils.searchContacts(leads, 'john');

  console.log(`Found ${searchResults.length} leads matching 'john'`);
  return searchResults;
}

/**
 * Example: Bulk tag operations
 */
async function bulkTagExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Get contacts to tag
  const response = await client.getContacts({
    lifecycle_stage: KeapLifecycleStage.LEAD,
    limit: 50,
  });

  const contactIds = response.items.map(c => c.id);

  // Create a new tag
  const tag = await client.createTag({
    name: 'Hot Lead',
    category: 'Sales',
    description: 'Leads that are ready to buy',
  });

  // Bulk apply tag
  await utils.batchUpdateContactTags(
    client,
    contactIds,
    [tag.id],
    'add'
  );

  console.log(`Tagged ${contactIds.length} contacts with 'Hot Lead'`);
}

// ============================================
// Order Management Examples
// ============================================

/**
 * Example: Create and process an order
 */
async function createOrderExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Create an order
  const order = await client.createOrder({
    contact: {
      id: 'contact_123',
      email: 'customer@example.com',
      given_name: 'Jane',
      family_name: 'Smith',
    },
    order_items: [
      {
        id: 'item_1',
        name: 'Premium Subscription',
        quantity: 1,
        price: utils.parseMoney(99.99, 'USD'),
        product: {
          id: 'product_123',
          name: 'Premium Subscription',
          description: 'Monthly premium access',
        },
      },
    ],
    total: utils.parseMoney(99.99, 'USD'),
    subtotal: utils.parseMoney(99.99, 'USD'),
    status: KeapOrderStatus.DRAFT,
    order_date: new Date().toISOString(),
  });

  // Update order status to paid
  const paidOrder = await client.updateOrderStatus(order.id, KeapOrderStatus.PAID);

  console.log('Order processed:', utils.formatMoney(paidOrder.total));
  return paidOrder;
}

/**
 * Example: Generate revenue report
 */
async function revenueReportExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Get last 90 days of orders
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const orders = await utils.fetchAllPages<KeapOrder>(
    (offset) => client.getOrders({
      since: since.toISOString(),
      limit: 100,
      offset,
    })
  );

  // Calculate statistics
  const stats = utils.getOrderStats(orders);
  const monthlyReport = utils.generateMonthlyRevenueReport(orders);

  console.log('Order Statistics:', stats);
  console.log('Monthly Revenue:', monthlyReport);

  // Export to CSV
  const csv = utils.exportOrdersToCSV(orders);
  // Save CSV to file or send to user

  return { stats, monthlyReport };
}

// ============================================
// Subscription Management Examples
// ============================================

/**
 * Example: Manage subscription lifecycle
 */
async function subscriptionLifecycleExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Create a subscription
  const subscription = await client.createSubscription({
    contact_id: 'contact_123',
    product_id: 'product_456',
    billing_amount: 49.99,
    billing_cycle: KeapBillingCycle.MONTHLY,
    start_date: new Date().toISOString(),
    status: KeapSubscriptionStatus.ACTIVE,
    active: true,
    auto_renew: true,
  });

  console.log('Created subscription:', subscription.id);

  // Pause subscription for vacation
  const pauseDate = new Date();
  pauseDate.setDate(pauseDate.getDate() + 14); // Pause for 2 weeks
  const pausedSub = await client.pauseSubscription(
    subscription.id,
    pauseDate.toISOString(),
    'Customer vacation'
  );

  console.log('Subscription paused until:', pausedSub.pause_until);

  // Resume subscription
  const resumedSub = await client.resumeSubscription(subscription.id);
  console.log('Subscription resumed');

  // Calculate next billing date
  const nextBillDate = utils.calculateNextBillingDate(
    resumedSub.start_date,
    KeapBillingCycle.MONTHLY,
    resumedSub.cycles_completed || 0
  );
  console.log('Next billing date:', nextBillDate);

  return resumedSub;
}

/**
 * Example: Calculate and monitor MRR
 */
async function mrrAnalysisExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Get all active subscriptions
  const subscriptions = await utils.fetchAllPages<KeapSubscription>(
    (offset) => client.getSubscriptions({
      status: KeapSubscriptionStatus.ACTIVE,
      active: true,
      limit: 100,
      offset,
    })
  );

  // Calculate MRR
  const mrr = utils.calculateMRR(subscriptions);
  console.log('Monthly Recurring Revenue:', mrr);

  // Calculate churn rate
  const churnRate = utils.calculateChurnRate(subscriptions, 30);
  console.log('30-day churn rate:', churnRate + '%');

  // Find subscriptions expiring soon
  const expiringSoon = subscriptions.filter(sub => {
    if (!sub.next_bill_date) return false;
    const daysUntilBilling = utils.daysUntil(sub.next_bill_date);
    return daysUntilBilling <= 7 && daysUntilBilling > 0;
  });

  console.log('Subscriptions expiring in 7 days:', expiringSoon.length);

  return { mrr, churnRate, expiringSoon };
}

// ============================================
// Payment Processing Examples
// ============================================

/**
 * Example: Record and refund payments
 */
async function paymentProcessingExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Record a payment
  const payment = await client.recordPayment({
    amount: utils.parseMoney(150.00, 'USD'),
    contact_id: 'contact_123',
    order_id: 'order_456',
    payment_date: new Date().toISOString(),
    payment_method: 'Credit Card',
    gateway: 'Stripe',
    gateway_transaction_id: 'ch_1234567890',
    last_four: '4242',
    card_type: 'Visa',
    status: 'PAID' as any,
  });

  console.log('Payment recorded:', payment.id);

  // Process partial refund
  const refund = await client.refundPayment(
    payment.id,
    50.00,
    'Customer requested partial refund'
  );

  console.log('Refund processed:', utils.formatMoney(refund.refunded_amount!));

  return { payment, refund };
}

// ============================================
// Automation & Webhook Examples
// ============================================

/**
 * Example: Set up webhooks for real-time updates
 */
async function webhookSetupExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Create webhook for new contacts
  const contactWebhook = await client.createWebhook({
    hook_url: 'https://your-domain.com/webhooks/keap/contacts',
    event_key: 'contact.add',
    status: 'ACTIVE',
    verify_ssl: true,
    secret_key: 'your-secret-key',
  });

  // Create webhook for paid orders
  const orderWebhook = await client.createWebhook({
    hook_url: 'https://your-domain.com/webhooks/keap/orders',
    event_key: 'order.paid',
    status: 'ACTIVE',
    verify_ssl: true,
    secret_key: 'your-secret-key',
  });

  console.log('Webhooks created:', {
    contacts: contactWebhook.id,
    orders: orderWebhook.id,
  });

  // Verify webhooks
  await client.verifyWebhook(contactWebhook.id);
  await client.verifyWebhook(orderWebhook.id);

  return { contactWebhook, orderWebhook };
}

// ============================================
// Data Sync Examples
// ============================================

/**
 * Example: Sync contacts with external system
 */
async function contactSyncExample() {
  const client = new KeapClientEnhanced({ apiKey: process.env.KEAP_API_KEY! });

  // Get contacts modified since last sync
  const lastSyncDate = new Date('2024-01-01');
  const response = await client.getContacts({
    since: lastSyncDate.toISOString(),
    limit: 100,
  });

  // Process each contact
  for (const contact of response.items) {
    // Check for differences with external system
    const externalContact = await getExternalContact(contact.id); // Your implementation

    if (externalContact) {
      const differences = utils.getContactDifferences(externalContact as any, contact);

      if (Object.keys(differences).length > 0) {
        console.log(`Syncing contact ${contact.id}:`, differences);
        await updateExternalContact(contact.id, differences); // Your implementation
      }
    } else {
      console.log(`Creating new external contact for ${contact.id}`);
      await createExternalContact(contact); // Your implementation
    }
  }

  return response.items.length;
}

// ============================================
// Error Handling Examples
// ============================================

/**
 * Example: Robust error handling with retries
 */
async function errorHandlingExample() {
  const client = new KeapClientEnhanced({
    apiKey: process.env.KEAP_API_KEY!,
    maxRetries: 3,
    retryDelay: 1000,
    retryOnRateLimit: true,
    debug: true,
  });

  try {
    // This will automatically retry on failure
    const contact = await client.getContact('contact_123');
    console.log('Contact retrieved:', utils.formatContactName(contact));
  } catch (error) {
    if (error.message.includes('404')) {
      console.log('Contact not found');
    } else if (error.message.includes('429')) {
      console.log('Rate limited - consider reducing request frequency');
    } else if (error.message.includes('timeout')) {
      console.log('Request timed out - check network connection');
    } else {
      console.error('Unexpected error:', error);
    }
  }

  // Check API usage
  const usage = await client.getApiUsage();
  console.log('API Usage:', usage);
}

// ============================================
// Performance Optimization Examples
// ============================================

/**
 * Example: Optimize performance with caching and batching
 */
async function performanceExample() {
  const client = new KeapClientEnhanced({
    apiKey: process.env.KEAP_API_KEY!,
    enableCache: true,
    cacheTTL: 600000, // 10 minutes
  });

  // First call - fetches from API
  console.time('First fetch');
  const orders1 = await client.getOrders({ limit: 100 });
  console.timeEnd('First fetch');

  // Second call - served from cache
  console.time('Cached fetch');
  const orders2 = await client.getOrders({ limit: 100 });
  console.timeEnd('Cached fetch');

  // Batch operations for efficiency
  const batchRequests = [
    { method: 'GET' as const, path: '/contacts/contact_1' },
    { method: 'GET' as const, path: '/contacts/contact_2' },
    { method: 'GET' as const, path: '/contacts/contact_3' },
  ];

  console.time('Batch fetch');
  const batchResults = await client.batch(batchRequests);
  console.timeEnd('Batch fetch');

  // Clear cache for specific pattern
  client.clearCache('contacts');

  // Check cache statistics
  const cacheStats = client.getCacheStats();
  console.log('Cache stats:', cacheStats);

  return { orders: orders1.items.length, batchCount: batchResults.responses.length };
}

// ============================================
// Cloudflare Workers Integration Example
// ============================================

/**
 * Example: Use in Cloudflare Workers
 */
export async function handleRequest(request: Request): Promise<Response> {
  // Initialize client with environment variables
  const client = new KeapClientEnhanced({
    apiKey: (globalThis as any).KEAP_API_KEY,
    enableCache: true,
    debug: false,
  });

  const url = new URL(request.url);

  try {
    switch (url.pathname) {
      case '/api/contacts':
        const contacts = await client.getContacts({ limit: 50 });
        return new Response(JSON.stringify(contacts), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/api/orders':
        const orders = await client.getOrders({ limit: 50 });
        return new Response(JSON.stringify(orders), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/api/revenue':
        const allOrders = await utils.fetchAllPages<KeapOrder>(
          (offset) => client.getOrders({ limit: 100, offset })
        );
        const revenue = utils.calculateTotalRevenue(allOrders);
        return new Response(JSON.stringify({ revenue }), {
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Helper functions (implement these based on your external system)
async function getExternalContact(id: string): Promise<any> {
  // Your implementation
  return null;
}

async function updateExternalContact(id: string, data: any): Promise<void> {
  // Your implementation
}

async function createExternalContact(contact: KeapContact): Promise<void> {
  // Your implementation
}