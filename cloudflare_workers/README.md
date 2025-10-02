# Keap-Supabase Sync - Cloudflare Workers

A complete Cloudflare Workers solution for synchronizing Keap CRM data with Supabase, featuring OAuth token management, webhook processing, and scheduled sync operations.

## Architecture Overview

This system consists of three Cloudflare Workers that work together:

### 🔄 Sync Coordinator (`sync-coordinator`)
- **Purpose**: OAuth token management and sync coordination using Durable Objects
- **Features**: Keap OAuth flow, token refresh, sync state management
- **Resources**: Durable Objects, KV namespace, Hyperdrive
- **Endpoints**: `/oauth/*`, `/coordinator/*`, `/health`

### ⚡ Sync Worker (`sync-worker`) 
- **Purpose**: Scheduled and on-demand data synchronization operations
- **Features**: Rate-limited Keap API client, Supabase integration, cron triggers
- **Resources**: Service binding to coordinator, KV cache, Hyperdrive
- **Endpoints**: `/sync/*`, `/health`
- **Schedule**: Runs every 30 minutes automatically

### 🪝 Webhook Handler (`webhook-handler`)
- **Purpose**: Real-time webhook processing from Keap CRM
- **Features**: HMAC signature verification, event processing
- **Resources**: Service binding to coordinator
- **Endpoints**: `/webhook`, `/health`

## Quick Start

### Prerequisites

1. **Cloudflare Account** with Workers Paid plan ($5/month - required for Durable Objects)
2. **Supabase Project** with service role key
3. **Keap Developer Account** with OAuth application configured
4. **Node.js 18+** and **npm** installed

### Automated Deployment

The fastest way to deploy is using the automated deployment script:

```bash
# 1. Clone and navigate to the workers directory
cd cloudflare_workers

# 2. Copy environment template and configure
cp .env.example .env
# Edit .env with your actual values

# 3. Run automated deployment
./deploy.sh
```

The script will:
- Create all required Cloudflare resources (KV, Hyperdrive, Durable Objects)
- Update wrangler.toml files with actual resource IDs
- Set up secrets and environment variables
- Deploy all workers in the correct order
- Provide worker URLs for Keap configuration

### Manual Deployment

For more control over the deployment process, see [manual-setup.md](./manual-setup.md).

## Development Setup

### Local Development

```bash
# Set up development environment
./dev-setup.sh

# Start all development servers
./dev-setup.sh start-all

# Run tests
./dev-setup.sh test-all

# Stop development servers
./dev-setup.sh stop-all
```

Development servers will be available at:
- **Sync Coordinator**: http://localhost:8787
- **Sync Worker**: http://localhost:8788  
- **Webhook Handler**: http://localhost:8789

### Testing Individual Workers

```bash
# Test a specific worker
cd sync-coordinator
npm run dev    # Start development server
npm run test   # Run tests

# Deploy individual worker
npm run deploy
```

## Configuration

### Required Environment Variables

Set these as Cloudflare Worker secrets using `wrangler secret put`:

#### Sync Coordinator & Sync Worker
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

#### Sync Coordinator Only
```bash
KEAP_CLIENT_ID=your-keap-client-id
KEAP_CLIENT_SECRET=your-keap-client-secret
```

#### Webhook Handler Only
```bash
KEAP_WEBHOOK_SECRET=your-webhook-secret
```

### Cloudflare Resources

The deployment script automatically creates:

#### KV Namespace
- **Purpose**: Cache sync metadata, OAuth tokens, and operation state
- **Binding**: `SYNC_CACHE`
- **Shared by**: All workers

#### Hyperdrive Configuration
- **Purpose**: Optimized PostgreSQL connections to Supabase
- **Binding**: `HYPERDRIVE`
- **Used by**: sync-coordinator, sync-worker

#### Durable Objects
- **Class**: `SyncCoordinator`
- **Purpose**: Persistent OAuth token management and sync coordination
- **Location**: sync-coordinator worker

#### Service Bindings
- **From**: sync-worker, webhook-handler
- **To**: sync-coordinator
- **Purpose**: Inter-worker communication

## Keap Integration Setup

### 1. OAuth Application Configuration

In your [Keap Developer Console](https://keys.developer.keap.com/):

1. Create or edit your OAuth application
2. Set the redirect URL to:
   ```
   https://sync-coordinator.YOUR_SUBDOMAIN.workers.dev/oauth/callback
   ```
3. Note your Client ID and Client Secret for worker secrets

### 2. Webhook Configuration

In Keap, set up webhooks pointing to:
```
https://webhook-handler.YOUR_SUBDOMAIN.workers.dev/webhook
```

Configure these events (recommended):
- Contact created/updated
- Opportunity created/updated
- Order created/updated
- Task created/completed

Use the same secret you set as `KEAP_WEBHOOK_SECRET`.

## Usage

### OAuth Flow

1. **Initiate OAuth**: Navigate to `https://sync-coordinator.YOUR_SUBDOMAIN.workers.dev/oauth/initiate`
2. **Authorize**: Complete Keap authorization
3. **Callback**: System automatically handles token exchange and storage

### Manual Sync Operations

```bash
# Trigger full sync
curl -X POST https://sync-worker.YOUR_SUBDOMAIN.workers.dev/sync/full

# Sync specific data type
curl -X POST https://sync-worker.YOUR_SUBDOMAIN.workers.dev/sync/contacts

# Check sync status
curl https://sync-worker.YOUR_SUBDOMAIN.workers.dev/sync/status
```

### Webhook Testing

```bash
# Test webhook endpoint (requires valid HMAC signature)
curl -X POST https://webhook-handler.YOUR_SUBDOMAIN.workers.dev/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hook-Signature: HMAC_SIGNATURE" \
  -d '{"event_type": "contact.add", "data": {...}}'
```

## Monitoring and Maintenance

### Health Checks

Each worker provides a health endpoint:

```bash
# Check all workers
curl https://sync-coordinator.YOUR_SUBDOMAIN.workers.dev/health
curl https://sync-worker.YOUR_SUBDOMAIN.workers.dev/health
curl https://webhook-handler.YOUR_SUBDOMAIN.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "services": {
    "durable_objects": true,
    "kv_cache": true,
    "hyperdrive": true
  }
}
```

### Real-time Monitoring

```bash
# Monitor worker logs
wrangler tail sync-coordinator --format pretty
wrangler tail sync-worker --format pretty
wrangler tail webhook-handler --format pretty

# View analytics
wrangler pages deployment tail
```

### Deployment Validation

Use the validation script to verify your deployment:

```bash
# Full validation
./validate-deployment.sh

# Health checks only
./validate-deployment.sh health-only

# Configuration validation only
./validate-deployment.sh config-only
```

## Troubleshooting

### Common Issues

#### 1. KV Namespace Errors
```
Error: KV namespace not found
```
**Solution**: Verify namespace IDs in wrangler.toml match created namespaces
```bash
wrangler kv:namespace list
```

#### 2. Hyperdrive Connection Issues
```
Error: Cannot connect to database
```
**Solution**: Check Supabase connection string and IP allowlist
```bash
wrangler hyperdrive list
```

#### 3. Service Binding Errors
```
Error: Service not found: sync-coordinator
```
**Solution**: Ensure sync-coordinator is deployed before other workers
```bash
wrangler list
```

#### 4. OAuth Token Issues
```
Error: Invalid or expired token
```
**Solution**: Re-run OAuth flow or check token storage in Durable Objects

#### 5. Webhook Signature Verification Failures
```
Error: Invalid webhook signature
```
**Solution**: Verify webhook secret matches Keap configuration

### Debug Commands

```bash
# List all workers
wrangler list

# Check worker status
wrangler status sync-coordinator

# View KV data
wrangler kv:key list --namespace-id YOUR_KV_ID

# Test Hyperdrive connection
wrangler hyperdrive get supabase-hyperdrive

# View Durable Object instances
wrangler durable-objects list --class SyncCoordinator
```

### Performance Optimization

#### KV Cache Strategy
- **TTL**: 1 hour for sync metadata
- **Keys**: Structured as `sync:${type}:${id}`
- **Cleanup**: Automatic expiration

#### Rate Limiting
- **Keap API**: 150 requests/minute (configurable)
- **Exponential backoff**: Automatic retry on rate limits
- **Batch operations**: Minimize API calls

#### Hyperdrive Benefits
- **Connection pooling**: Reduces Supabase connection overhead
- **Query caching**: Improves response times
- **Regional optimization**: Routes to nearest region

## Security Considerations

### Secrets Management
- Use `wrangler secret put` for sensitive values
- Never commit secrets to version control
- Rotate secrets regularly
- Use different secrets for development/production

### CORS Configuration
```javascript
// Restrict origins in production
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### Webhook Security
- HMAC signature verification required
- HTTPS-only endpoints
- Duplicate event detection
- Rate limiting on webhook endpoint

### Database Security
- Service role key used (full access)
- Row Level Security (RLS) recommended in Supabase
- Connection encryption via Hyperdrive
- Audit logging for data changes

## Cost Optimization

### Cloudflare Workers Pricing
- **Bundled Plan**: $5/month (includes Durable Objects)
- **Requests**: 10M included, $0.15/million after
- **CPU Time**: 30M milliseconds included
- **KV**: 1GB included, $0.50/GB after

### Expected Usage
- **Sync operations**: ~1000 requests/month
- **Webhooks**: Variable based on Keap activity
- **OAuth flows**: Minimal usage

### Cost Reduction Tips
1. **Optimize sync frequency**: Reduce cron schedule if feasible
2. **Efficient KV usage**: Clean up expired cache entries
3. **Batch operations**: Combine multiple updates
4. **Conditional sync**: Only sync changed data

## Support and Contributing

### Getting Help
1. Check [troubleshooting section](#troubleshooting)
2. Review worker logs using `wrangler tail`
3. Validate deployment with `./validate-deployment.sh`
4. Test individual components with health endpoints

### Development Guidelines
1. **Code Style**: TypeScript strict mode, ESLint configuration
2. **Testing**: Vitest with Cloudflare Workers test environment
3. **Error Handling**: Comprehensive try-catch with logging
4. **Documentation**: JSDoc comments for all functions

### File Structure
```
cloudflare_workers/
├── sync-coordinator/          # OAuth and coordination logic
│   ├── src/
│   │   ├── index.ts          # Main worker entry point
│   │   ├── sync-coordinator.ts # Durable Object implementation
│   │   ├── keap-oauth.ts     # OAuth flow handling
│   │   └── types.ts          # TypeScript definitions
│   ├── test/                 # Vitest test files
│   ├── wrangler.toml         # Worker configuration
│   └── package.json          # Dependencies
├── sync-worker/              # Scheduled sync operations
├── webhook-handler/          # Real-time webhook processing
├── deploy.sh                 # Automated deployment script
├── dev-setup.sh             # Development environment setup
├── validate-deployment.sh   # Deployment validation
└── manual-setup.md          # Manual deployment guide
```

This system provides a robust, scalable solution for Keap-Supabase synchronization with proper error handling, monitoring, and security features.