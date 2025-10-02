# Keap-Supabase Bidirectional Sync System - Implementation Tasks

This document outlines all tasks required to complete the Keap-Supabase Bidirectional Sync System PRP as specified in `/Users/meganharrison/Documents/github/ns projects/ns-ai-agent-mastery/ns_Agent_Deployment/PRPs/keap-supabase-sync.md`.

## Project Overview

Transform the existing Vite React frontend into a production-ready Next.js dashboard with full bidirectional synchronization between Keap CRM and Supabase, leveraging Cloudflare Workers for edge computing optimization.

---

## Phase 1: Cloudflare Workers Foundation

### Task 1.1: Cloudflare Workers Setup
**Priority: Critical**
**Estimated Time: 4-6 hours**

- [ ] **Install Wrangler CLI** and authenticate with Cloudflare account
- [ ] **Create Durable Object project** for sync coordination (`cloudflare_workers/sync-coordinator/`)
- [ ] **Configure KV namespace** for sync metadata caching
- [ ] **Setup Hyperdrive binding** for optimized Supabase database connections
- [ ] **Create wrangler.toml** configurations for all three workers
- [ ] **Initialize TypeScript** project structure with proper types

**Key Files to Create:**
- `cloudflare_workers/sync-coordinator/wrangler.toml`
- `cloudflare_workers/sync-coordinator/src/index.ts`
- `cloudflare_workers/sync-coordinator/package.json`

### Task 1.2: Durable Object OAuth Token Management
**Priority: Critical**
**Estimated Time: 6-8 hours**

- [ ] **Implement SyncCoordinator Durable Object** class with persistent storage
- [ ] **Create OAuth token storage methods** with encryption
- [ ] **Build token refresh automation** (21-hour schedule to prevent expiry)
- [ ] **Add token validation** and expiry checking
- [ ] **Implement per-account isolation** (one Durable Object per Keap account)

**Key Files to Create:**
- `cloudflare_workers/sync-coordinator/src/sync-coordinator.ts`
- `cloudflare_workers/sync-coordinator/src/oauth-manager.ts`

---

## Phase 2: Keap OAuth2 Integration

### Task 2.1: Complete OAuth2 Flow Implementation
**Priority: Critical**
**Estimated Time: 8-10 hours**

- [ ] **Implement OAuth initiation** with proper state parameter handling
- [ ] **Create authorization code exchange** functionality
- [ ] **Build automatic token refresh** mechanism with proper error handling
- [ ] **Handle refresh token rotation** (Keap rotates refresh tokens on each refresh)
- [ ] **Add comprehensive error handling** for all OAuth failure scenarios
- [ ] **Implement CSRF protection** with state validation

**Key Requirements:**
- Authorization URL: `https://accounts.infusionsoft.com/app/oauth/authorize`
- Token endpoint: `https://api.infusionsoft.com/token`
- Scope: `full` (only supported scope)
- Refresh tokens expire after 45 days if unused
- Client secret in Basic Auth header for token refresh

**Key Files to Create:**
- `cloudflare_workers/sync-coordinator/src/keap-oauth.ts`
- `cloudflare_workers/sync-coordinator/src/types.ts`

### Task 2.2: OAuth Security & Validation
**Priority: High**
**Estimated Time: 4-6 hours**

- [ ] **Implement secure token storage** with encryption
- [ ] **Add token validation endpoints** for health checks
- [ ] **Create OAuth flow testing** utilities
- [ ] **Build token revocation** functionality
- [ ] **Add comprehensive logging** for audit trails

---

## Phase 3: Next.js Migration & Setup

### Task 3.1: Next.js Project Initialization
**Priority: Critical**
**Estimated Time: 6-8 hours**

- [ ] **Create new Next.js project** with App Router (`frontend_nextjs/`)
- [ ] **Setup Tailwind CSS** and shadcn/ui component library
- [ ] **Configure TypeScript** with strict settings
- [ ] **Setup Supabase client** for Next.js environment
- [ ] **Configure environment variables** (update from Vite to Next.js format)
- [ ] **Create project structure** following Next.js best practices

**Migration Requirements:**
- Change `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`
- Update all component imports and exports
- Add `'use client'` directive for interactive components
- Convert Vite routing to Next.js App Router

**Key Files to Create:**
- `frontend_nextjs/next.config.js`
- `frontend_nextjs/tailwind.config.ts`
- `frontend_nextjs/lib/supabase.ts`
- `frontend_nextjs/lib/utils.ts`

### Task 3.2: Component Migration from Vite
**Priority: High**
**Estimated Time: 8-12 hours**

- [ ] **Migrate existing components** from `frontend/src/components/`
- [ ] **Update all import paths** and environment variable references
- [ ] **Convert to Next.js patterns** (Server vs Client components)
- [ ] **Update styling** to use Tailwind CSS consistently
- [ ] **Test component functionality** in Next.js environment
- [ ] **Preserve existing authentication** patterns and flows

**Components to Migrate:**
- Authentication components
- Dashboard layouts
- Charts and data visualization
- Form components
- Navigation and sidebar

---

## Phase 4: Database Schema Enhancement

### Task 4.1: Sync Tables Creation
**Priority: Critical**
**Estimated Time: 4-6 hours**

- [ ] **Create sync_contacts table** with Keap ID mapping
- [ ] **Create sync_orders table** with bidirectional fields
- [ ] **Create sync_tags table** for tag management
- [ ] **Create sync_subscriptions table** for subscription tracking
- [ ] **Add audit fields** (created_at, updated_at, last_synced_at)
- [ ] **Create proper indexes** for performance optimization

**Key Files to Create:**
- `sql/10-sync-tables.sql`
- `sql/10-sync-indexes.sql`

### Task 4.2: Sync Status & Conflict Management
**Priority: High**
**Estimated Time: 4-6 hours**

- [ ] **Create sync_status table** for tracking sync operations
- [ ] **Create sync_conflicts table** for conflict resolution
- [ ] **Add sync metadata fields** to existing tables
- [ ] **Create database functions** for sync operations
- [ ] **Setup RLS policies** for sync service access
- [ ] **Enable realtime subscriptions** on sync tables

**Key Files to Create:**
- `sql/11-sync-functions.sql`
- `sql/12-sync-rls-policies.sql`

---

## Phase 5: Webhook Handler Worker

### Task 5.1: Webhook Receiver Implementation
**Priority: Critical**
**Estimated Time: 6-8 hours**

- [ ] **Create webhook handler Worker** (`cloudflare_workers/webhook-handler/`)
- [ ] **Implement HMAC signature verification** using Web Crypto API
- [ ] **Parse webhook event types** (contact.edit, order.add, etc.)
- [ ] **Route events to appropriate Durable Objects**
- [ ] **Add idempotent processing** to prevent duplicate operations
- [ ] **Implement comprehensive error handling**

**Security Requirements:**
- Verify `X-Hook-Signature` header using HMAC-SHA256
- Use `crypto.subtle.timingSafeEqual` for signature comparison
- Store webhook secret securely in environment variables

**Key Files to Create:**
- `cloudflare_workers/webhook-handler/src/index.ts`
- `cloudflare_workers/webhook-handler/src/hmac-verify.ts`
- `cloudflare_workers/webhook-handler/src/event-router.ts`

### Task 5.2: Event Processing & Coordination
**Priority: High**
**Estimated Time: 4-6 hours**

- [ ] **Implement event queuing** for reliable processing
- [ ] **Add webhook retry logic** for failed events
- [ ] **Create event deduplication** mechanisms
- [ ] **Build webhook testing utilities**
- [ ] **Add comprehensive logging** for debugging

---

## Phase 6: Sync Worker Implementation

### Task 6.1: Scheduled Sync Worker
**Priority: Critical**
**Estimated Time: 8-10 hours**

- [ ] **Create sync worker** with cron trigger (`cloudflare_workers/sync-worker/`)
- [ ] **Implement Hyperdrive-optimized Supabase client**
- [ ] **Build rate-limited Keap API client** (1500 requests/minute limit)
- [ ] **Create batch processing** for large datasets
- [ ] **Implement sync coordination** with Durable Objects
- [ ] **Add comprehensive error handling** and retry logic

**Rate Limiting Requirements:**
- Respect Keap's 1500 requests per minute limit
- Implement exponential backoff for failed requests
- Use request queuing to prevent rate limit violations
- Monitor and log API usage statistics

**Key Files to Create:**
- `cloudflare_workers/sync-worker/src/index.ts`
- `cloudflare_workers/sync-worker/src/keap-client.ts`
- `cloudflare_workers/sync-worker/src/supabase-client.ts`
- `cloudflare_workers/sync-worker/src/rate-limiter.ts`

### Task 6.2: Conflict Detection & Resolution
**Priority: High**
**Estimated Time: 6-8 hours**

- [ ] **Implement conflict detection** algorithms
- [ ] **Create resolution strategies** (timestamp-based, manual, etc.)
- [ ] **Build conflict queue management**
- [ ] **Add manual resolution interfaces**
- [ ] **Implement sync rollback** mechanisms

---

## Phase 7: Next.js Dashboard Implementation

### Task 7.1: Dashboard API Layer
**Priority: Critical**
**Estimated Time: 6-8 hours**

- [ ] **Create Next.js API routes** for dashboard data (`app/api/dashboard/`)
- [ ] **Implement KPI calculation endpoints**
- [ ] **Build sync status monitoring APIs**
- [ ] **Create conflict management endpoints**
- [ ] **Add authentication middleware**
- [ ] **Implement proper error handling**

**API Endpoints to Create:**
- `/api/dashboard/kpis` - Business metrics
- `/api/dashboard/sync-status` - Sync operation status
- `/api/dashboard/conflicts` - Conflict management
- `/api/dashboard/health` - System health checks

**Key Files to Create:**
- `frontend_nextjs/app/api/dashboard/kpis/route.ts`
- `frontend_nextjs/app/api/dashboard/sync-status/route.ts`
- `frontend_nextjs/app/api/dashboard/conflicts/route.ts`
- `frontend_nextjs/lib/dashboard-queries.ts`

### Task 7.2: Dashboard Components
**Priority: High**
**Estimated Time: 10-12 hours**

- [ ] **Create SyncStatus component** for real-time sync monitoring
- [ ] **Build KpiCharts component** using Recharts library
- [ ] **Implement ConflictAlerts component** for conflict notifications
- [ ] **Create DataTable components** with filtering and search
- [ ] **Build real-time updates** using Supabase subscriptions
- [ ] **Add responsive design** for mobile compatibility

**Key Files to Create:**
- `frontend_nextjs/components/dashboard/SyncStatus.tsx`
- `frontend_nextjs/components/dashboard/KpiCharts.tsx`
- `frontend_nextjs/components/dashboard/ConflictAlerts.tsx`
- `frontend_nextjs/components/dashboard/DataTable.tsx`

### Task 7.3: Dashboard Pages & Layout
**Priority: High**
**Estimated Time: 6-8 hours**

- [ ] **Create dashboard page** (`app/dashboard/page.tsx`)
- [ ] **Build dashboard layout** with navigation
- [ ] **Implement admin interface** for sync management
- [ ] **Add export functionality** for reports
- [ ] **Create loading states** and error boundaries
- [ ] **Setup proper SEO metadata**

**Key Files to Create:**
- `frontend_nextjs/app/dashboard/page.tsx`
- `frontend_nextjs/app/dashboard/layout.tsx`
- `frontend_nextjs/app/sync-admin/page.tsx`

---

## Phase 8: Enhanced Backend Sync Service

### Task 8.1: Python Sync Service Enhancement
**Priority: Medium**
**Estimated Time: 8-10 hours**

- [ ] **Create enhanced sync engine** (`backend_sync_service/`)
- [ ] **Build Keap API wrapper** with OAuth2 integration
- [ ] **Implement sync orchestration** with Cloudflare Workers
- [ ] **Create backup webhook handlers** for reliability
- [ ] **Add comprehensive logging** and monitoring
- [ ] **Build health check endpoints**

**Key Files to Create:**
- `backend_sync_service/sync_engine.py`
- `backend_sync_service/keap_client.py`
- `backend_sync_service/oauth_manager.py`
- `backend_sync_service/webhook_handlers.py`

### Task 8.2: Sync Models & Validation
**Priority: Medium**
**Estimated Time: 4-6 hours**

- [ ] **Create Pydantic models** for all sync entities
- [ ] **Implement data validation** and transformation
- [ ] **Build type safety** throughout the service
- [ ] **Add comprehensive error handling**
- [ ] **Create sync status tracking**

**Key Files to Create:**
- `backend_sync_service/sync_models.py`
- `backend_sync_service/data_validators.py`

---

## Phase 9: Testing & Validation

### Task 9.1: Unit Testing
**Priority: High**
**Estimated Time: 12-16 hours**

- [ ] **Create Cloudflare Workers tests** using Vitest
- [ ] **Build Python service tests** using pytest
- [ ] **Implement Next.js component tests** using Jest/Testing Library
- [ ] **Test OAuth flow** with mock Keap API
- [ ] **Test webhook verification** with real signatures
- [ ] **Test rate limiting** functionality

**Test Files to Create:**
- `cloudflare_workers/sync-coordinator/src/test/oauth.test.ts`
- `cloudflare_workers/webhook-handler/src/test/webhook.test.ts`
- `backend_sync_service/tests/test_sync_engine.py`
- `frontend_nextjs/__tests__/dashboard.test.tsx`

### Task 9.2: Integration Testing
**Priority: High**
**Estimated Time: 8-10 hours**

- [ ] **Deploy Workers to staging** environment
- [ ] **Test end-to-end OAuth flow**
- [ ] **Validate webhook processing**
- [ ] **Test sync operations** with mock data
- [ ] **Verify dashboard functionality**
- [ ] **Test conflict resolution** workflows

### Task 9.3: Performance Testing
**Priority: Medium**
**Estimated Time: 6-8 hours**

- [ ] **Load test API endpoints**
- [ ] **Test batch processing** performance
- [ ] **Validate rate limiting** under load
- [ ] **Test database query performance**
- [ ] **Monitor memory usage** and optimization

---

## Phase 10: Production Deployment

### Task 10.1: Environment Configuration
**Priority: Critical**
**Estimated Time: 4-6 hours**

- [ ] **Configure production Cloudflare account**
- [ ] **Setup production Supabase project**
- [ ] **Create production Keap application**
- [ ] **Configure all environment variables**
- [ ] **Setup monitoring and alerting**
- [ ] **Configure backup strategies**

### Task 10.2: Deployment Pipeline
**Priority: High**
**Estimated Time: 6-8 hours**

- [ ] **Create CI/CD pipeline** for automated deployment
- [ ] **Setup staging environment** for testing
- [ ] **Configure production deployment** scripts
- [ ] **Add deployment validation** checks
- [ ] **Create rollback procedures**
- [ ] **Document deployment process**

---

## Validation Checklist

### Technical Validation
- [ ] All TypeScript builds without errors
- [ ] Python services pass ruff and mypy checks
- [ ] All unit tests pass (>90% coverage)
- [ ] Integration tests pass in staging
- [ ] Performance benchmarks meet requirements
- [ ] Security audit passes (no exposed secrets)

### Functional Validation
- [ ] OAuth flow works end-to-end
- [ ] Webhooks process correctly with signature verification
- [ ] Sync operations handle rate limits properly
- [ ] Conflicts are detected and resolved
- [ ] Dashboard displays real-time data
- [ ] Token refresh automation functions
- [ ] All API endpoints respond correctly

### Production Readiness
- [ ] Cloudflare Workers deployed to production
- [ ] Next.js application builds and deploys
- [ ] Database migrations applied successfully
- [ ] Environment variables configured
- [ ] Monitoring and alerting active
- [ ] Documentation complete

---

## Estimated Timeline

**Total Estimated Time: 100-140 hours (12-18 weeks for one developer)**

### Phase Breakdown:
- **Phase 1-2 (Cloudflare Workers + OAuth):** 20-30 hours (3-4 weeks)
- **Phase 3 (Next.js Migration):** 14-20 hours (2-3 weeks)
- **Phase 4 (Database Schema):** 8-12 hours (1-2 weeks)
- **Phase 5-6 (Workers Implementation):** 18-26 hours (3-4 weeks)
- **Phase 7 (Dashboard Implementation):** 22-28 hours (3-4 weeks)
- **Phase 8 (Backend Enhancement):** 12-16 hours (2 weeks)
- **Phase 9 (Testing):** 26-34 hours (3-4 weeks)
- **Phase 10 (Production Deployment):** 10-14 hours (1-2 weeks)

### Critical Path Dependencies:
1. **Cloudflare Workers Foundation** → **OAuth Implementation**
2. **OAuth Implementation** → **Webhook Handler**
3. **Next.js Migration** → **Dashboard Components**
4. **Database Schema** → **Sync Workers**
5. **All Workers** → **Integration Testing**

---

## Success Criteria

Upon completion, the system will provide:

1. **Bidirectional Sync**: Real-time synchronization between Keap and Supabase
2. **Professional Dashboard**: Modern Next.js interface with real-time updates
3. **Conflict Resolution**: Automated conflict detection with manual override
4. **Security**: OAuth2 flow with proper token management
5. **Performance**: Edge-optimized with proper rate limiting
6. **Reliability**: Comprehensive error handling and recovery
7. **Scalability**: Production-ready architecture with monitoring

The completed system will transform manual CRM data management into an automated, intelligent synchronization platform with advanced analytics capabilities.