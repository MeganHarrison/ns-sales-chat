# Keap API Integration Suite

A comprehensive TypeScript library for integrating with the Keap (formerly Infusionsoft) REST API v2. This suite provides type-safe access to all Keap API endpoints with built-in caching, retry logic, and utility functions.

## 📦 What's Included

- **`keap-types.ts`** - Complete TypeScript type definitions for all Keap entities
- **`keap-client-enhanced.ts`** - Enhanced API client with caching, retry logic, and rate limiting
- **`keap-utils.ts`** - Utility functions for common operations and data transformations
- **`keap-examples.ts`** - Practical examples and usage patterns

## 🚀 Quick Start

### Installation

1. Copy the Keap integration files to your project:
```bash
cp cloudflare_workers/keap-*.ts your-project/src/lib/keap/
```

2. Install required dependencies (if not already installed):
```bash
npm install node-fetch # Only needed for Node.js environments
```

### Basic Usage

```typescript
import { KeapClientEnhanced } from './keap-client-enhanced';
import { KeapContact, KeapLifecycleStage } from './keap-types';

// Initialize the client
const client = new KeapClientEnhanced({
  apiKey: process.env.KEAP_API_KEY!,
  enableCache: true,
  debug: true
});

// Fetch contacts
const contacts = await client.getContacts({
  lifecycle_stage: KeapLifecycleStage.LEAD,
  limit: 50
});

// Create a new contact
const newContact = await client.createContact({
  given_name: 'John',
  family_name: 'Doe',
  email_addresses: [{
    email: 'john@example.com',
    is_primary: true
  }]
});
```

## 🔑 Authentication

The client supports two authentication methods:

### API Key Authentication
```typescript
const client = new KeapClientEnhanced({
  apiKey: 'your-api-key-here'
});
```

### OAuth 2.0 Authentication
```typescript
const client = new KeapClientEnhanced({
  accessToken: 'your-access-token',
  refreshToken: 'your-refresh-token',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret'
});

// Auto-refresh tokens when expired
const newTokens = await client.refreshAccessToken();
```

## 🛠️ Features

### Type Safety
All API responses are fully typed, providing excellent IDE support and compile-time safety:

```typescript
// TypeScript knows the exact shape of the response
const order: KeapOrder = await client.getOrder('order_123');
console.log(order.total.amount); // Auto-complete works!
```

### Intelligent Caching
Reduce API calls and improve performance with built-in caching:

```typescript
const client = new KeapClientEnhanced({
  apiKey: 'your-key',
  enableCache: true,
  cacheTTL: 300000 // 5 minutes
});

// First call hits the API
const products1 = await client.getProducts();

// Second call served from cache
const products2 = await client.getProducts();

// Clear cache when needed
client.clearCache('products');
```

### Automatic Retry Logic
Handle transient failures gracefully:

```typescript
const client = new KeapClientEnhanced({
  apiKey: 'your-key',
  maxRetries: 3,
  retryDelay: 1000,
  retryOnRateLimit: true
});
```

### Rate Limiting Protection
Automatically respects Keap's rate limits:

```typescript
// Client automatically delays requests to avoid rate limits
const usage = await client.getApiUsage();
console.log(`Remaining requests: ${usage.rateLimitRemaining}`);
```

## 📊 Common Use Cases

### Contact Management

```typescript
import * as utils from './keap-utils';

// Search contacts
const contacts = await client.getContacts({ search_term: 'john' });

// Filter by lifecycle stage
const leads = utils.filterContactsByStage(contacts.items, KeapLifecycleStage.LEAD);

// Bulk tag operations
await utils.batchUpdateContactTags(
  client,
  ['contact_1', 'contact_2'],
  [123, 456], // tag IDs
  'add'
);

// Export to CSV
const csv = utils.exportContactsToCSV(contacts.items);
```

### Order & Revenue Tracking

```typescript
// Get recent orders
const orders = await client.getOrders({
  since: '2024-01-01',
  status: KeapOrderStatus.PAID
});

// Calculate statistics
const stats = utils.getOrderStats(orders.items);
const totalRevenue = utils.calculateTotalRevenue(orders.items);

// Generate monthly report
const monthlyReport = utils.generateMonthlyRevenueReport(orders.items);
```

### Subscription Management

```typescript
// Get active subscriptions
const subscriptions = await client.getSubscriptions({
  status: KeapSubscriptionStatus.ACTIVE
});

// Calculate MRR
const mrr = utils.calculateMRR(subscriptions.items);

// Pause subscription
await client.pauseSubscription(
  'sub_123',
  '2024-12-31',
  'Customer vacation'
);

// Calculate churn rate
const churnRate = utils.calculateChurnRate(subscriptions.items, 30);
```

### Webhook Integration

```typescript
// Create webhook
const webhook = await client.createWebhook({
  hook_url: 'https://your-domain.com/webhooks/keap',
  event_key: 'contact.add',
  status: 'ACTIVE',
  verify_ssl: true
});

// Verify webhook
await client.verifyWebhook(webhook.id);
```

## 🌐 Cloudflare Workers Integration

Perfect for serverless deployments:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = new KeapClientEnhanced({
      apiKey: env.KEAP_API_KEY,
      enableCache: true
    });

    const url = new URL(request.url);

    if (url.pathname === '/api/contacts') {
      const contacts = await client.getContacts({ limit: 50 });
      return Response.json(contacts);
    }

    if (url.pathname === '/api/revenue') {
      const orders = await client.getOrders({
        status: KeapOrderStatus.PAID
      });
      const revenue = utils.calculateTotalRevenue(orders.items);
      return Response.json({ revenue });
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

## 🔄 Data Synchronization

Sync Keap data with external systems:

```typescript
// Get contacts modified since last sync
const lastSync = new Date('2024-01-01');
const contacts = await client.getContacts({
  since: lastSync.toISOString()
});

// Process each contact
for (const contact of contacts.items) {
  const differences = utils.getContactDifferences(
    oldContact,
    contact
  );

  if (Object.keys(differences).length > 0) {
    await updateExternalSystem(contact.id, differences);
  }
}
```

## 📈 Performance Tips

### 1. Use Pagination Wisely
```typescript
// Fetch all pages efficiently
const allOrders = await utils.fetchAllPages<KeapOrder>(
  (offset) => client.getOrders({ limit: 100, offset })
);
```

### 2. Leverage Batch Operations
```typescript
const batchRequests = [
  { method: 'GET', path: '/contacts/contact_1' },
  { method: 'GET', path: '/contacts/contact_2' },
  { method: 'GET', path: '/contacts/contact_3' }
];

const results = await client.batch(batchRequests);
```

### 3. Cache Strategically
```typescript
// Cache rarely changing data longer
const products = await client.getProducts(); // Uses default TTL

// Don't cache frequently changing data
const orders = await client.getOrders(); // Consider disabling cache
```

## 🐛 Error Handling

```typescript
try {
  const contact = await client.getContact('contact_123');
} catch (error) {
  if (error.message.includes('404')) {
    console.log('Contact not found');
  } else if (error.message.includes('429')) {
    console.log('Rate limited');
  } else if (error.message.includes('timeout')) {
    console.log('Request timeout');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 📝 Environment Variables

```env
# Required
KEAP_API_KEY=your-api-key

# For OAuth
KEAP_ACCESS_TOKEN=your-access-token
KEAP_REFRESH_TOKEN=your-refresh-token
KEAP_CLIENT_ID=your-client-id
KEAP_CLIENT_SECRET=your-client-secret

# Optional
KEAP_BASE_URL=https://api.infusionsoft.com/crm/rest
KEAP_API_VERSION=v2
```

## 🔧 Configuration Options

```typescript
interface KeapClientConfig {
  // Authentication (one required)
  apiKey?: string;
  accessToken?: string;

  // OAuth (optional)
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;

  // API Settings
  baseUrl?: string;         // Default: https://api.infusionsoft.com/crm/rest
  version?: 'v1' | 'v2';     // Default: v2
  timeout?: number;          // Default: 30000ms

  // Retry Configuration
  maxRetries?: number;       // Default: 3
  retryDelay?: number;       // Default: 1000ms
  retryOnRateLimit?: boolean; // Default: true

  // Caching
  enableCache?: boolean;     // Default: true
  cacheTTL?: number;         // Default: 300000ms (5 minutes)

  // Logging
  debug?: boolean;           // Default: false
  logger?: Function;         // Default: console.log
}
```

## 📚 Type Definitions

The `keap-types.ts` file includes comprehensive types for:

- **Entities**: Contact, Order, Product, Subscription, Payment, Invoice, Company, Task, Note, etc.
- **Enums**: OrderStatus, SubscriptionStatus, LifecycleStage, BillingCycle, etc.
- **Utilities**: Money, Address, PhoneNumber, EmailAddress, CustomField, etc.
- **API Types**: ListResponse, ApiResponse, QueryOptions, BatchRequest, etc.

## 🤝 Contributing

Feel free to extend these files for your specific needs. Key areas for extension:

1. Add more utility functions in `keap-utils.ts`
2. Add custom business logic wrappers
3. Implement additional webhook handlers
4. Create specialized report generators

## 🔒 Security Considerations

1. **Never commit API keys** - Use environment variables
2. **Validate webhook signatures** - Verify requests are from Keap
3. **Implement rate limiting** - Protect your endpoints
4. **Use HTTPS only** - Ensure secure communication
5. **Rotate API keys regularly** - Maintain security hygiene

## 📄 License

This integration suite is provided as-is for use in your projects. Modify and extend as needed.

## 🆘 Support

For Keap API issues:
- [Keap Developer Portal](https://developer.infusionsoft.com/)
- [API Documentation](https://developer.infusionsoft.com/docs/rest/)
- [Developer Forum](https://community.keap.com/)

## 🎯 Next Steps

1. Copy the integration files to your project
2. Set up your environment variables
3. Initialize the client with your credentials
4. Start making API calls with full type safety!

---

Built with TypeScript for modern web applications, Cloudflare Workers, and Node.js environments.