# Keap to Supabase Contact Sync Strategy

## Overview
This document outlines the strategy for syncing Keap contacts with Supabase, with special focus on tracking "Active Client" status based on tags.

## Architecture Components

### 1. Database Schema

```sql
-- Core contacts table (mirrors Keap data)
CREATE TABLE keap_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keap_id TEXT UNIQUE NOT NULL,
  email TEXT,
  given_name TEXT,
  family_name TEXT,
  company_name TEXT,
  lifecycle_stage TEXT,
  lead_score INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  tag_ids INTEGER[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  is_active_client BOOLEAN GENERATED ALWAYS AS (
    tags @> '[{"name": "Active Client"}]'::jsonb
  ) STORED,
  date_created TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE,
  keap_last_updated TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending',
  sync_last_attempt TIMESTAMP WITH TIME ZONE,
  sync_last_success TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync history for audit trail
CREATE TABLE keap_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'webhook'
  entity_type TEXT NOT NULL, -- 'contact', 'order', 'tag'
  entity_id TEXT,
  operation TEXT, -- 'create', 'update', 'delete'
  status TEXT, -- 'success', 'failed', 'skipped'
  changes JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags reference table
CREATE TABLE keap_tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact-tag relationship (for efficient querying)
CREATE TABLE keap_contact_tags (
  contact_id UUID REFERENCES keap_contacts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES keap_tags(id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (contact_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX idx_keap_contacts_email ON keap_contacts(email);
CREATE INDEX idx_keap_contacts_is_active ON keap_contacts(is_active_client);
CREATE INDEX idx_keap_contacts_sync_status ON keap_contacts(sync_status);
CREATE INDEX idx_keap_contacts_tags ON keap_contacts USING GIN(tags);
CREATE INDEX idx_keap_contacts_updated ON keap_contacts(keap_last_updated);

-- Create views for reporting
CREATE VIEW active_clients AS
SELECT
  id,
  keap_id,
  email,
  given_name,
  family_name,
  company_name,
  lifecycle_stage,
  tags,
  date_created,
  last_updated
FROM keap_contacts
WHERE is_active_client = true;

CREATE VIEW sync_status_summary AS
SELECT
  sync_status,
  COUNT(*) as count,
  MAX(sync_last_success) as last_success
FROM keap_contacts
GROUP BY sync_status;
```

### 2. Sync Methods

#### Method 1: Webhook-Based (Real-time)
- **Pros**: Instant updates, efficient, minimal API calls
- **Cons**: Requires public endpoint, potential missed events
- **Best for**: Production environments with public URLs

#### Method 2: Polling-Based (Periodic)
- **Pros**: Reliable, works locally, can handle bulk updates
- **Cons**: Delayed updates, more API calls
- **Best for**: Development, local testing, backup sync

#### Method 3: Hybrid Approach (Recommended)
- Use webhooks for real-time updates
- Run periodic full sync daily for reconciliation
- Incremental sync every hour as backup

### 3. Implementation Strategy

#### Phase 1: Initial Setup
1. Create Supabase tables and views
2. Implement initial bulk import
3. Set up basic sync service

#### Phase 2: Real-time Sync
1. Implement webhook endpoint
2. Add webhook registration with Keap
3. Process webhook events

#### Phase 3: Monitoring & Reports
1. Build sync status dashboard
2. Create active client reports
3. Add error handling and retry logic

## Sync Service Implementation

### Core Sync Service
```typescript
interface SyncStrategy {
  // Initial full sync
  performInitialSync(): Promise<SyncResult>;

  // Incremental sync based on last update
  performIncrementalSync(since: Date): Promise<SyncResult>;

  // Process webhook event
  processWebhook(event: KeapWebhookEvent): Promise<void>;

  // Sync specific contact
  syncContact(keapId: string): Promise<void>;

  // Handle tag changes
  updateContactTags(keapId: string, tags: KeapTag[]): Promise<void>;
}
```

### Webhook Events to Monitor
- `contact.add` - New contact created
- `contact.edit` - Contact updated
- `contact.delete` - Contact deleted
- `contactTag.applied` - Tag added to contact
- `contactTag.removed` - Tag removed from contact

## Active Client Tracking

### Tag-Based Approach
1. Monitor for "Active Client" tag in webhook events
2. Update `is_active_client` computed column automatically
3. Trigger notifications on status change

### Reporting Queries
```sql
-- Active clients count by month
SELECT
  DATE_TRUNC('month', date_created) as month,
  COUNT(*) as new_active_clients
FROM keap_contacts
WHERE is_active_client = true
GROUP BY month
ORDER BY month DESC;

-- Recently deactivated clients
SELECT *
FROM keap_sync_logs
WHERE entity_type = 'contact'
  AND changes->>'removed_tags' @> '"Active Client"'
  AND created_at > NOW() - INTERVAL '7 days';

-- Client lifecycle transitions
WITH status_changes AS (
  SELECT
    entity_id,
    changes->>'old_status' as old_status,
    changes->>'new_status' as new_status,
    created_at
  FROM keap_sync_logs
  WHERE entity_type = 'contact'
    AND changes ? 'old_status'
)
SELECT * FROM status_changes
ORDER BY created_at DESC;
```

## Error Handling & Recovery

### Sync Failure Recovery
1. Log all sync attempts in `keap_sync_logs`
2. Implement exponential backoff for retries
3. Alert on repeated failures
4. Provide manual sync trigger

### Data Consistency Checks
1. Compare counts between Keap and Supabase
2. Validate tag consistency
3. Check for orphaned records
4. Monitor sync lag time

## Performance Considerations

### Optimization Strategies
1. Batch API requests (max 100 contacts per call)
2. Use database transactions for bulk updates
3. Implement connection pooling
4. Cache frequently accessed data

### Rate Limiting
- Keap API: 10 requests per second
- Implement rate limiting in sync service
- Use queue for webhook processing

## Security Considerations

1. Store Keap API keys in environment variables
2. Validate webhook signatures
3. Use Row Level Security (RLS) in Supabase
4. Encrypt sensitive custom fields
5. Audit trail for all changes

## Monitoring & Alerts

### Key Metrics to Track
- Sync success rate
- Average sync duration
- Number of active clients
- Tag change frequency
- API rate limit usage

### Alert Conditions
- Sync failures > 3 consecutive
- No successful sync in 24 hours
- Active client count drops > 10%
- Webhook endpoint down

## Implementation Timeline

### Week 1
- Database schema setup
- Initial import service
- Basic sync functionality

### Week 2
- Webhook implementation
- Real-time updates
- Error handling

### Week 3
- Reporting views
- Sync monitoring
- Performance optimization

### Week 4
- Testing & refinement
- Documentation
- Deployment

## Next Steps

1. Review and approve schema design
2. Set up Supabase tables
3. Implement initial sync service
4. Configure Keap webhooks
5. Build reporting dashboard