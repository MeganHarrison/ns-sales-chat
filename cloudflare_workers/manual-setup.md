# Manual Cloudflare Workers Setup Guide

This guide provides step-by-step instructions for manually setting up the Keap-Supabase sync system when you need more control over the deployment process.

## Prerequisites

1. **Cloudflare Account** with Workers plan (Paid plan recommended for production)
2. **Wrangler CLI** installed and authenticated
3. **Supabase Project** with service role key
4. **Keap Developer Account** with OAuth app configured

### Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

## Step 1: Create Cloudflare Resources

### 1.1 Create KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create "sync-cache" --preview false

# Create preview KV namespace for development
wrangler kv:namespace create "sync-cache" --preview true
```

Save the namespace IDs - you'll need them for wrangler.toml configuration.

### 1.2 Create Hyperdrive Configuration

```bash
# Create Hyperdrive config for Supabase connection pooling
wrangler hyperdrive create supabase-hyperdrive \
  --connection-string "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

Replace `[PASSWORD]` and `[HOST]` with your Supabase credentials:
- Password: Found in Supabase Dashboard > Settings > Database
- Host: Extract from your Supabase URL (e.g., `db.abc123.supabase.co`)

## Step 2: Configure Wrangler Files

### 2.1 Update sync-coordinator/wrangler.toml

```toml
name = "sync-coordinator"
compatibility_date = "2025-01-15"
main = "src/index.ts"

[observability]
enabled = true

# Durable Objects configuration
[[durable_objects.bindings]]
name = "SYNC_COORDINATOR"
class_name = "SyncCoordinator"
script_name = "sync-coordinator"

# KV namespace binding
[[kv_namespaces]]
binding = "SYNC_CACHE"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_KV_PREVIEW_ID"

# Hyperdrive binding
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "YOUR_HYPERDRIVE_CONFIG_ID"

[vars]
ENVIRONMENT = "development"

# Production environment
[env.production.vars]
ENVIRONMENT = "production"

[env.production.kv_namespaces]
SYNC_CACHE = "YOUR_PRODUCTION_KV_ID"

[env.production.hyperdrive]
HYPERDRIVE = "YOUR_PRODUCTION_HYPERDRIVE_ID"
```

### 2.2 Update sync-worker/wrangler.toml

```toml
name = "sync-worker"
compatibility_date = "2025-01-15"
main = "src/index.ts"

[observability]
enabled = true

# Service binding to sync-coordinator
[[services]]
binding = "SYNC_COORDINATOR"
service = "sync-coordinator"

# Hyperdrive binding
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "YOUR_HYPERDRIVE_CONFIG_ID"

# KV namespace binding
[[kv_namespaces]]
binding = "SYNC_CACHE"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_KV_PREVIEW_ID"

# Scheduled trigger (every 30 minutes)
[[triggers]]
crons = ["0,30 * * * *"]

[vars]
ENVIRONMENT = "development"

# Production environment
[env.production.vars]
ENVIRONMENT = "production"

[env.production.services]
SYNC_COORDINATOR = "sync-coordinator"

[env.production.kv_namespaces]
SYNC_CACHE = "YOUR_PRODUCTION_KV_ID"

[env.production.hyperdrive]
HYPERDRIVE = "YOUR_PRODUCTION_HYPERDRIVE_ID"
```

### 2.3 Update webhook-handler/wrangler.toml

```toml
name = "webhook-handler"
compatibility_date = "2025-01-15"
main = "src/index.ts"

[observability]
enabled = true

# Service binding to sync-coordinator
[[services]]
binding = "SYNC_COORDINATOR"
service = "sync-coordinator"

[vars]
ENVIRONMENT = "development"

# Production environment
[env.production.vars]
ENVIRONMENT = "production"

[env.production.services]
SYNC_COORDINATOR = "sync-coordinator"
```

## Step 3: Configure Secrets

Set up environment variables and secrets for each worker:

### 3.1 Sync Coordinator Secrets

```bash
cd sync-coordinator

# Supabase configuration
echo "https://your-project.supabase.co" | wrangler secret put SUPABASE_URL
echo "your-service-role-key" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Keap OAuth configuration
echo "your-keap-client-id" | wrangler secret put KEAP_CLIENT_ID
echo "your-keap-client-secret" | wrangler secret put KEAP_CLIENT_SECRET
```

### 3.2 Sync Worker Secrets

```bash
cd sync-worker

# Supabase configuration
echo "https://your-project.supabase.co" | wrangler secret put SUPABASE_URL
echo "your-service-role-key" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### 3.3 Webhook Handler Secrets

```bash
cd webhook-handler

# Keap webhook verification
echo "your-webhook-secret" | wrangler secret put KEAP_WEBHOOK_SECRET
```

## Step 4: Deploy Workers

Deploy workers in the correct order (dependencies first):

### 4.1 Deploy Sync Coordinator (First)

```bash
cd sync-coordinator
npm install
wrangler deploy
```

### 4.2 Deploy Sync Worker

```bash
cd sync-worker
npm install
wrangler deploy
```

### 4.3 Deploy Webhook Handler

```bash
cd webhook-handler
npm install
wrangler deploy
```

## Step 5: Test Deployment

### 5.1 Health Check Endpoints

Test each worker's health endpoint:

```bash
# Sync Coordinator
curl https://sync-coordinator.YOUR_SUBDOMAIN.workers.dev/health

# Sync Worker  
curl https://sync-worker.YOUR_SUBDOMAIN.workers.dev/health

# Webhook Handler
curl https://webhook-handler.YOUR_SUBDOMAIN.workers.dev/health
```

Expected response for all:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "services": {
    // Service-specific status indicators
  }
}
```

### 5.2 Verify Worker Logs

Monitor worker logs for any issues:

```bash
# Monitor sync-coordinator logs
wrangler tail sync-coordinator

# Monitor sync-worker logs  
wrangler tail sync-worker

# Monitor webhook-handler logs
wrangler tail webhook-handler
```

## Step 6: Configure Keap Integration

### 6.1 Set Up OAuth Redirect URL

In your Keap Developer Console, configure the OAuth redirect URL:

```
https://sync-coordinator.YOUR_SUBDOMAIN.workers.dev/oauth/callback
```

### 6.2 Configure Webhook Endpoint

In Keap, set up webhooks pointing to:

```
https://webhook-handler.YOUR_SUBDOMAIN.workers.dev/webhook
```

Use the webhook secret you configured earlier for HMAC verification.

## Step 7: Production Environment

For production deployment, use the production environment:

```bash
# Deploy to production environment
wrangler deploy --env production

# Set production-specific secrets
echo "production-supabase-url" | wrangler secret put SUPABASE_URL --env production
```

## Troubleshooting

### Common Issues

1. **KV Namespace Not Found**
   - Verify namespace IDs in wrangler.toml match created namespaces
   - Check that preview and production IDs are different

2. **Hyperdrive Connection Errors**
   - Verify Supabase connection string is correct
   - Check that Supabase allows connections from Cloudflare IPs

3. **Service Binding Errors**
   - Ensure sync-coordinator is deployed before other workers
   - Verify service names match exactly in wrangler.toml

4. **Secret Access Issues**
   - Confirm secrets are set for correct worker
   - Check environment (development vs production)

### Debug Commands

```bash
# List all workers
wrangler list

# View worker details
wrangler status WORKER_NAME

# Check KV namespaces
wrangler kv:namespace list

# Check Hyperdrive configs
wrangler hyperdrive list

# View worker logs in real-time
wrangler tail WORKER_NAME --format pretty
```

## Security Considerations

1. **Secrets Management**
   - Never commit real secrets to version control
   - Use different secrets for development and production
   - Rotate secrets regularly

2. **CORS Configuration**
   - Configure appropriate CORS headers for your domain
   - Restrict origins in production

3. **Rate Limiting**
   - Monitor Keap API usage to avoid rate limits
   - Implement exponential backoff for failed requests

4. **Webhook Security**
   - Always verify HMAC signatures for webhooks
   - Use HTTPS-only endpoints
   - Implement duplicate event detection

## Monitoring and Maintenance

1. **Set Up Alerts**
   - Configure Cloudflare Workers analytics alerts
   - Monitor error rates and response times

2. **Regular Maintenance**
   - Review worker logs regularly
   - Update dependencies periodically
   - Test backup and recovery procedures

3. **Performance Optimization**
   - Monitor Hyperdrive connection efficiency
   - Optimize KV cache hit rates
   - Review Durable Object usage patterns