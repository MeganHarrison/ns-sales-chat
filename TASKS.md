# TASKS.md - Complete Keap-Supabase Sync System Deployment

## Critical Context
The codebase exists but NOTHING is deployed or functional. This task list contains EVERY SINGLE ACTION required to go from current state to fully deployed, working system.

## Phase 1: Infrastructure Setup

### 1.1 Supabase Setup
- [ ] Create Supabase project at app.supabase.com
- [ ] Note down project URL and anon key
- [ ] Generate service role key from project settings
- [ ] Enable Row Level Security (RLS) policies
- [ ] Run database migrations to create tables:
  - [ ] Create `keap_contacts` table
  - [ ] Create `keap_orders` table
  - [ ] Create `keap_tags` table
  - [ ] Create `keap_subscriptions` table
  - [ ] Create `sync_status` table
  - [ ] Create `sync_conflicts` table
  - [ ] Create `webhook_logs` table
  - [ ] Create `oauth_tokens` table
- [ ] Create database indexes for performance:
  - [ ] Index on keap_id fields
  - [ ] Index on sync timestamps
  - [ ] Index on conflict status
- [ ] Set up Supabase Auth configuration
- [ ] Configure database connection pooling

### 1.2 Cloudflare Account Setup
- [ ] Create Cloudflare account if not exists
- [ ] Install Wrangler CLI globally: `npm install -g wrangler`
- [ ] Authenticate Wrangler: `wrangler login`
- [ ] Verify authentication: `wrangler whoami`
- [ ] Get Account ID from Cloudflare dashboard
- [ ] Update all wrangler.toml files with correct account_id

### 1.3 Cloudflare KV Namespaces
- [ ] Create KV namespace for sync cache: `wrangler kv:namespace create SYNC_CACHE`
- [ ] Create KV namespace for oauth tokens: `wrangler kv:namespace create OAUTH_TOKENS`
- [ ] Create KV namespace for webhook cache: `wrangler kv:namespace create WEBHOOK_CACHE`
- [ ] Note down all KV namespace IDs
- [ ] Update wrangler.toml files with KV namespace bindings

### 1.4 Cloudflare Hyperdrive Setup
- [ ] Navigate to Cloudflare dashboard → Workers & Pages → Hyperdrive
- [ ] Click "Create configuration"
- [ ] Enter Supabase database connection string
- [ ] Name it "supabase-hyperdrive"
- [ ] Note down Hyperdrive configuration ID
- [ ] Update all wrangler.toml files with Hyperdrive binding

### 1.5 Keap API Configuration
- [ ] Log into Keap developer account
- [ ] Create new application in Keap developer portal
- [ ] Configure OAuth redirect URLs:
  - [ ] Add local development URL
  - [ ] Add production worker URL
- [ ] Note down Client ID and Client Secret
- [ ] Generate initial access token for testing
- [ ] Configure webhook endpoints in Keap

## Phase 2: Environment Configuration

### 2.1 Local Environment Files
- [ ] Create `.env.local` in root directory with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  KEAP_CLIENT_ID=your_keap_client_id
  KEAP_CLIENT_SECRET=your_keap_client_secret
  KEAP_REDIRECT_URI=your_redirect_uri
  CLOUDFLARE_ACCOUNT_ID=your_account_id
  CLOUDFLARE_API_TOKEN=your_api_token
  SYNC_WORKER_URL=https://sync-worker.your-subdomain.workers.dev
  WEBHOOK_HANDLER_URL=https://webhook-handler.your-subdomain.workers.dev
  SYNC_COORDINATOR_URL=https://sync-coordinator.your-subdomain.workers.dev
  ```

### 2.2 Cloudflare Worker Secrets
- [ ] Set secrets for sync-worker:
  ```bash
  wrangler secret put SUPABASE_URL --env production
  wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
  wrangler secret put KEAP_CLIENT_ID --env production
  wrangler secret put KEAP_CLIENT_SECRET --env production
  ```
- [ ] Set secrets for webhook-handler (same process)
- [ ] Set secrets for sync-coordinator (same process)

### 2.3 Update Configuration Files
- [ ] Update `wrangler.toml` in sync-worker with:
  - [ ] Correct account_id
  - [ ] KV namespace IDs
  - [ ] Hyperdrive configuration ID
  - [ ] Route configuration
- [ ] Update `wrangler.toml` in webhook-handler (same items)
- [ ] Update `wrangler.toml` in sync-coordinator (same items)

## Phase 3: Database Setup

### 3.1 Create Database Schema
- [ ] Connect to Supabase SQL editor
- [ ] Run migration for keap_contacts table:
  ```sql
  CREATE TABLE keap_contacts (
    id SERIAL PRIMARY KEY,
    keap_id INTEGER UNIQUE NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    company VARCHAR(200),
    job_title VARCHAR(100),
    date_created TIMESTAMP,
    last_updated TIMESTAMP,
    tags JSONB,
    custom_fields JSONB,
    sync_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Run migration for keap_orders table
- [ ] Run migration for keap_tags table
- [ ] Run migration for keap_subscriptions table
- [ ] Run migration for sync_status table
- [ ] Run migration for sync_conflicts table
- [ ] Run migration for webhook_logs table
- [ ] Run migration for oauth_tokens table

### 3.2 Create RLS Policies
- [ ] Create RLS policy for keap_contacts (read/write)
- [ ] Create RLS policy for keap_orders (read/write)
- [ ] Create RLS policy for sync_status (read only)
- [ ] Create RLS policy for sync_conflicts (read/write)
- [ ] Enable RLS on all tables

### 3.3 Create Database Functions
- [ ] Create function for conflict resolution
- [ ] Create function for sync status updates
- [ ] Create trigger for updated_at timestamps
- [ ] Create function for webhook processing

## Phase 4: Cloudflare Workers Deployment

### 4.1 Build and Test Workers Locally
- [ ] Navigate to sync-worker directory
- [ ] Run `npm install` to install dependencies
- [ ] Run `npm run build` to compile TypeScript
- [ ] Run `wrangler dev` to test locally
- [ ] Verify health endpoint works: `curl http://localhost:8787/health`
- [ ] Repeat for webhook-handler
- [ ] Repeat for sync-coordinator

### 4.2 Deploy sync-worker
- [ ] From sync-worker directory run:
  ```bash
  wrangler deploy --env production
  ```
- [ ] Verify deployment successful
- [ ] Test health endpoint on deployed URL
- [ ] Check Cloudflare dashboard for worker status
- [ ] Verify KV namespace bindings
- [ ] Verify Hyperdrive connection

### 4.3 Deploy webhook-handler
- [ ] From webhook-handler directory run:
  ```bash
  wrangler deploy --env production
  ```
- [ ] Verify deployment successful
- [ ] Test webhook endpoint
- [ ] Configure Keap to send webhooks to this URL

### 4.4 Deploy sync-coordinator
- [ ] From sync-coordinator directory run:
  ```bash
  wrangler deploy --env production
  ```
- [ ] Verify deployment successful
- [ ] Test OAuth flow endpoint
- [ ] Verify token storage in KV

### 4.5 Configure Worker Routes
- [ ] Set up custom domain/subdomain for workers
- [ ] Configure routes in Cloudflare dashboard:
  - [ ] sync-worker.yourdomain.com → sync-worker
  - [ ] webhooks.yourdomain.com → webhook-handler
  - [ ] coordinator.yourdomain.com → sync-coordinator
- [ ] Update CORS settings if needed

## Phase 5: Next.js Application Deployment

### 5.1 Prepare for Deployment
- [ ] Run `npm run build` in root directory
- [ ] Fix any TypeScript errors that appear
- [ ] Fix any ESLint errors
- [ ] Ensure all tests pass: `npm test`
- [ ] Verify environment variables are set

### 5.2 Deploy to Vercel
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Run `vercel` in project root
- [ ] Link to existing project or create new
- [ ] Configure environment variables in Vercel dashboard:
  - [ ] Add all variables from .env.local
  - [ ] Add production URLs for workers
- [ ] Deploy: `vercel --prod`
- [ ] Verify deployment successful

### 5.3 Configure Production Settings
- [ ] Update Keap OAuth redirect to production URL
- [ ] Update Cloudflare worker CORS to allow production domain
- [ ] Configure custom domain if needed
- [ ] Set up SSL certificates

## Phase 6: Integration Testing

### 6.1 Test OAuth Flow
- [ ] Navigate to dashboard
- [ ] Click "Connect Keap Account"
- [ ] Complete OAuth authorization
- [ ] Verify token stored in Cloudflare KV
- [ ] Verify token refresh works

### 6.2 Test Manual Sync
- [ ] Click "Trigger Sync" in dashboard
- [ ] Monitor Cloudflare logs for sync-worker
- [ ] Verify contacts synced to Supabase
- [ ] Check sync_status table for records
- [ ] Verify no errors in logs

### 6.3 Test Scheduled Sync
- [ ] Configure cron trigger in wrangler.toml
- [ ] Deploy with cron enabled
- [ ] Wait for scheduled time
- [ ] Verify sync runs automatically
- [ ] Check KV for last sync timestamp

### 6.4 Test Webhook Processing
- [ ] Create/update contact in Keap
- [ ] Monitor webhook-handler logs
- [ ] Verify webhook received and processed
- [ ] Check Supabase for updated data
- [ ] Verify webhook_logs table has entry

### 6.5 Test Conflict Resolution
- [ ] Manually create conflict scenario
- [ ] Verify conflict detected
- [ ] Test manual resolution in dashboard
- [ ] Verify resolution applied correctly

## Phase 7: Monitoring & Logging

### 7.1 Set Up Cloudflare Analytics
- [ ] Enable Workers analytics in dashboard
- [ ] Configure custom metrics if needed
- [ ] Set up error alerting
- [ ] Configure performance monitoring

### 7.2 Set Up Logging
- [ ] Configure Cloudflare Logpush for workers
- [ ] Set up log aggregation service
- [ ] Create dashboards for monitoring
- [ ] Set up alerts for errors

### 7.3 Set Up Supabase Monitoring
- [ ] Enable database metrics
- [ ] Set up slow query alerts
- [ ] Monitor connection pool usage
- [ ] Set up backup schedule

## Phase 8: Documentation & Training

### 8.1 Create User Documentation
- [ ] Write user guide for dashboard
- [ ] Document OAuth connection process
- [ ] Create troubleshooting guide
- [ ] Document conflict resolution process

### 8.2 Create Technical Documentation
- [ ] Document API endpoints
- [ ] Create architecture diagram
- [ ] Document database schema
- [ ] Write deployment runbook

### 8.3 Create Admin Documentation
- [ ] Document secret rotation process
- [ ] Create disaster recovery plan
- [ ] Document scaling procedures
- [ ] Write maintenance procedures

## Phase 9: Security Hardening

### 9.1 Security Audit
- [ ] Review all API endpoints for auth
- [ ] Verify RLS policies are restrictive
- [ ] Check for exposed secrets in code
- [ ] Validate input sanitization

### 9.2 Rate Limiting
- [ ] Implement rate limiting on workers
- [ ] Configure Cloudflare WAF rules
- [ ] Set up DDoS protection
- [ ] Monitor for suspicious activity

### 9.3 Data Protection
- [ ] Implement data encryption at rest
- [ ] Set up audit logging
- [ ] Configure data retention policies
- [ ] Implement GDPR compliance if needed

## Phase 10: Performance Optimization

### 10.1 Database Optimization
- [ ] Analyze query performance
- [ ] Add missing indexes
- [ ] Optimize slow queries
- [ ] Configure connection pooling

### 10.2 Worker Optimization
- [ ] Implement caching strategies
- [ ] Optimize KV usage
- [ ] Reduce cold starts
- [ ] Implement batch processing

### 10.3 Frontend Optimization
- [ ] Implement lazy loading
- [ ] Optimize bundle size
- [ ] Add service worker for offline
- [ ] Implement CDN caching

## Completion Checklist

### Final Verification
- [ ] All workers deployed and healthy
- [ ] Database fully configured with data
- [ ] OAuth flow working end-to-end
- [ ] Manual sync successfully syncs data
- [ ] Scheduled sync runs automatically
- [ ] Webhooks process in real-time
- [ ] Dashboard displays accurate data
- [ ] Conflict resolution works
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Security hardened
- [ ] Performance optimized
- [ ] System ready for production use

## Notes

**CRITICAL**: None of these steps have been completed. The workers exist as code but are NOT deployed. The database schema does NOT exist. The KV namespaces are NOT created. The environment variables are NOT configured. This is a complete from-scratch deployment.

**Time Estimate**: 16-24 hours for complete deployment by experienced developer

**Prerequisites Required**:
1. Cloudflare account with Workers subscription
2. Supabase account (free tier ok for testing)
3. Keap developer account with API access
4. Vercel account for Next.js hosting (or alternative)
5. Domain name for production URLs

**Cost Considerations**:
- Cloudflare Workers: $5/month minimum
- Supabase: Free tier or $25/month
- Vercel: Free tier or $20/month
- Domain: ~$12/year
- Total: ~$50-60/month for production