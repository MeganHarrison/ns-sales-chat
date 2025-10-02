---
name: 🚀 Feature Request
about: Database Schema and Sync Infrastructure Setup
title: "[Feature] Create Comprehensive Database Schema for Bidirectional Sync with Audit Trails and Conflict Resolution"
labels: enhancement, database, backend, critical
assignees: '@claude'
---

## Problem Statement
The current database schema lacks the necessary tables, functions, and triggers to support bidirectional synchronization between Keap CRM and Supabase. We need a robust schema that handles:
- Storage of synced entities (contacts, orders, tags, subscriptions)
- Sync status tracking and metadata
- Conflict detection and resolution
- Audit trails for all sync operations
- Real-time triggers for bidirectional updates
- Performance optimization for high-volume sync operations

Without proper database infrastructure, the sync system will face data integrity issues, lost updates, and inability to recover from failures.

## Proposed Solution
Implement a comprehensive database schema with:

### 1. **Core Sync Tables**
   - Mirror Keap entities with additional sync metadata
   - Include audit fields for tracking changes
   - Support both Keap and Supabase identifiers
   - Enable real-time subscriptions

### 2. **Sync Management Tables**
   - Track sync status for each entity
   - Store conflict information
   - Maintain sync history and audit logs
   - Queue failed sync operations

### 3. **Database Functions & Triggers**
   - Automatic conflict detection
   - Resolution strategies implementation
   - Audit trail generation
   - Bidirectional sync triggers

### 4. **Performance Optimizations**
   - Strategic indexes for query performance
   - Partitioning for large tables
   - Connection pooling configuration
   - Vacuum and analyze automation

## Technical Requirements

### Database Tables Structure

#### 1. Core Entity Tables
```sql
-- sync_contacts table
CREATE TABLE sync_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keap_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    source_system VARCHAR(50) NOT NULL CHECK (source_system IN ('keap', 'supabase', 'manual')),

    -- Sync metadata
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_error TEXT,
    version INTEGER DEFAULT 1,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    -- Indexes
    INDEX idx_sync_contacts_email (email),
    INDEX idx_sync_contacts_keap_id (keap_id),
    INDEX idx_sync_contacts_sync_status (sync_status),
    INDEX idx_sync_contacts_updated_at (updated_at)
);

-- sync_orders table
CREATE TABLE sync_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keap_id VARCHAR(255) UNIQUE,
    contact_id UUID REFERENCES sync_contacts(id),
    order_number VARCHAR(255) UNIQUE,
    order_date TIMESTAMPTZ NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    line_items JSONB DEFAULT '[]'::jsonb,
    shipping_address JSONB,
    billing_address JSONB,

    -- Sync metadata
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_error TEXT,
    version INTEGER DEFAULT 1,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_sync_orders_contact_id (contact_id),
    INDEX idx_sync_orders_order_date (order_date),
    INDEX idx_sync_orders_status (status)
);

-- sync_tags table
CREATE TABLE sync_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keap_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(255),
    description TEXT,
    color VARCHAR(7),

    -- Sync metadata
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sync_subscriptions table
CREATE TABLE sync_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keap_id VARCHAR(255) UNIQUE,
    contact_id UUID REFERENCES sync_contacts(id),
    product_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    billing_cycle VARCHAR(50),
    amount DECIMAL(10, 2),

    -- Sync metadata
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_sync_subscriptions_contact_id (contact_id),
    INDEX idx_sync_subscriptions_status (status)
);
```

#### 2. Sync Management Tables
```sql
-- sync_status table
CREATE TABLE sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    keap_id VARCHAR(255),
    supabase_id UUID,
    sync_direction VARCHAR(50) NOT NULL CHECK (sync_direction IN ('keap_to_supabase', 'supabase_to_keap', 'bidirectional')),
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    last_sync_error TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(entity_type, entity_id),
    INDEX idx_sync_status_entity (entity_type, entity_id),
    INDEX idx_sync_status_last_sync (last_sync_at),
    INDEX idx_sync_status_retry (next_retry_at)
);

-- sync_conflicts table
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    keap_data JSONB NOT NULL,
    supabase_data JSONB NOT NULL,
    conflict_fields TEXT[] NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolution_strategy VARCHAR(50) CHECK (resolution_strategy IN ('keap_wins', 'supabase_wins', 'manual', 'merge')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,

    INDEX idx_sync_conflicts_entity (entity_type, entity_id),
    INDEX idx_sync_conflicts_detected (detected_at),
    INDEX idx_sync_conflicts_resolved (resolved_at)
);

-- sync_queue table
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(50) NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'sync')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_sync_queue_status (status, scheduled_at),
    INDEX idx_sync_queue_priority (priority, scheduled_at)
);

-- sync_audit_log table
CREATE TABLE sync_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    operation VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    sync_source VARCHAR(50) NOT NULL,
    sync_destination VARCHAR(50),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_operation (operation)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit log
CREATE TABLE sync_audit_log_2024_01 PARTITION OF sync_audit_log
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- Continue creating partitions...
```

### Database Functions

#### Conflict Detection Function
```sql
CREATE OR REPLACE FUNCTION detect_sync_conflict(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_keap_data JSONB,
    p_supabase_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_conflict_id UUID;
    v_conflict_fields TEXT[];
BEGIN
    -- Compare data and identify conflicting fields
    SELECT array_agg(key) INTO v_conflict_fields
    FROM (
        SELECT key
        FROM jsonb_each(p_keap_data) k
        FULL OUTER JOIN jsonb_each(p_supabase_data) s USING (key)
        WHERE k.value IS DISTINCT FROM s.value
    ) conflicts;

    IF array_length(v_conflict_fields, 1) > 0 THEN
        INSERT INTO sync_conflicts (
            entity_type, entity_id, keap_data, supabase_data, conflict_fields
        ) VALUES (
            p_entity_type, p_entity_id, p_keap_data, p_supabase_data, v_conflict_fields
        ) RETURNING id INTO v_conflict_id;

        RETURN v_conflict_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

#### Automatic Sync Trigger
```sql
CREATE OR REPLACE FUNCTION trigger_sync_on_update() RETURNS TRIGGER AS $$
BEGIN
    -- Queue sync operation when data changes
    INSERT INTO sync_queue (
        operation, entity_type, entity_id, payload, priority
    ) VALUES (
        'update',
        TG_TABLE_NAME,
        NEW.id,
        row_to_json(NEW)::jsonb,
        CASE
            WHEN NEW.sync_status = 'error' THEN 1
            WHEN NEW.sync_status = 'conflict' THEN 2
            ELSE 5
        END
    );

    -- Update sync metadata
    NEW.updated_at = NOW();
    NEW.version = COALESCE(OLD.version, 0) + 1;

    -- Log to audit trail
    INSERT INTO sync_audit_log (
        entity_type, entity_id, operation, old_data, new_data, sync_source
    ) VALUES (
        TG_TABLE_NAME, NEW.id, TG_OP,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb,
        'supabase'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all sync tables
CREATE TRIGGER sync_contacts_update
    BEFORE UPDATE ON sync_contacts
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_on_update();

CREATE TRIGGER sync_orders_update
    BEFORE UPDATE ON sync_orders
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_on_update();
```

#### Batch Sync Performance Function
```sql
CREATE OR REPLACE FUNCTION batch_upsert_contacts(
    p_contacts JSONB[]
) RETURNS TABLE (
    succeeded INTEGER,
    failed INTEGER,
    conflicts INTEGER
) AS $$
DECLARE
    v_succeeded INTEGER := 0;
    v_failed INTEGER := 0;
    v_conflicts INTEGER := 0;
    v_contact JSONB;
BEGIN
    FOREACH v_contact IN ARRAY p_contacts
    LOOP
        BEGIN
            -- Attempt upsert with conflict detection
            INSERT INTO sync_contacts (
                keap_id, email, first_name, last_name, tags, custom_fields
            ) VALUES (
                v_contact->>'keap_id',
                v_contact->>'email',
                v_contact->>'first_name',
                v_contact->>'last_name',
                v_contact->'tags',
                v_contact->'custom_fields'
            )
            ON CONFLICT (keap_id) DO UPDATE SET
                email = EXCLUDED.email,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                tags = EXCLUDED.tags,
                custom_fields = EXCLUDED.custom_fields,
                last_synced_at = NOW(),
                sync_status = 'completed';

            v_succeeded := v_succeeded + 1;

        EXCEPTION
            WHEN unique_violation THEN
                v_conflicts := v_conflicts + 1;
                -- Log conflict for resolution
                INSERT INTO sync_conflicts (
                    entity_type, entity_id, keap_data, supabase_data
                ) VALUES (
                    'sync_contacts',
                    (v_contact->>'id')::UUID,
                    v_contact,
                    (SELECT row_to_json(c) FROM sync_contacts c WHERE keap_id = v_contact->>'keap_id')
                );
            WHEN OTHERS THEN
                v_failed := v_failed + 1;
                -- Log error for retry
                INSERT INTO sync_queue (
                    operation, entity_type, payload, status, error_message
                ) VALUES (
                    'create', 'sync_contacts', v_contact, 'error', SQLERRM
                );
        END;
    END LOOP;

    RETURN QUERY SELECT v_succeeded, v_failed, v_conflicts;
END;
$$ LANGUAGE plpgsql;
```

### Row Level Security (RLS) Policies
```sql
-- Enable RLS on all sync tables
ALTER TABLE sync_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY service_role_all ON sync_contacts
    FOR ALL TO service_role
    USING (true);

-- Authenticated users read their own data
CREATE POLICY users_read_own ON sync_contacts
    FOR SELECT TO authenticated
    USING (created_by = auth.uid() OR updated_by = auth.uid());

-- Admin role for conflict resolution
CREATE POLICY admin_conflicts ON sync_conflicts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );
```

### Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_sync_contacts_email_status
    ON sync_contacts(email, sync_status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_sync_orders_date_status
    ON sync_orders(order_date DESC, sync_status)
    WHERE sync_status != 'completed';

-- Partial indexes for active records
CREATE INDEX idx_active_contacts
    ON sync_contacts(updated_at DESC)
    WHERE deleted_at IS NULL AND sync_status = 'completed';

-- GIN indexes for JSONB queries
CREATE INDEX idx_contacts_tags ON sync_contacts USING GIN (tags);
CREATE INDEX idx_contacts_custom ON sync_contacts USING GIN (custom_fields);

-- BRIN index for time-series data
CREATE INDEX idx_audit_log_created ON sync_audit_log USING BRIN (created_at);
```

## Migration Strategy

### Step 1: Create Base Tables
```sql
-- Run sequentially to handle dependencies
\i sql/10-sync-tables.sql
\i sql/11-sync-functions.sql
\i sql/12-sync-triggers.sql
\i sql/13-sync-indexes.sql
```

### Step 2: Enable Real-time
```sql
-- Enable real-time for sync status monitoring
ALTER TABLE sync_contacts REPLICA IDENTITY FULL;
ALTER TABLE sync_status REPLICA IDENTITY FULL;
ALTER TABLE sync_conflicts REPLICA IDENTITY FULL;

-- Grant real-time permissions
GRANT SELECT ON sync_status TO anon;
GRANT SELECT ON sync_conflicts TO authenticated;
```

### Step 3: Configure Partitioning
```sql
-- Automated partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition() RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'sync_audit_log_' || to_char(start_date, 'YYYY_MM');

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF sync_audit_log FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly execution
SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_monthly_partition()');
```

## Acceptance Criteria
- [ ] All sync tables created with proper schemas
- [ ] Foreign key relationships established correctly
- [ ] Audit fields present on all tables
- [ ] Sync status tracking functional
- [ ] Conflict detection function works correctly
- [ ] Automatic sync triggers fire on updates
- [ ] Batch upsert function handles 1000+ records
- [ ] RLS policies secure data access properly
- [ ] Performance indexes improve query speed >50%
- [ ] Real-time subscriptions work on sync tables
- [ ] Partitioning implemented for audit logs
- [ ] Database migrations run without errors
- [ ] Rollback scripts provided for all changes
- [ ] Documentation includes ER diagram
- [ ] Performance benchmarks meet requirements

## Performance Requirements
- Batch insert: >1000 records/second
- Query response: <100ms for indexed queries
- Conflict detection: <50ms per record
- Audit log writes: Non-blocking
- Real-time latency: <100ms
- Connection pool: 100 concurrent connections

## Testing Approach

### Unit Tests (SQL)
```sql
-- Test conflict detection
SELECT * FROM detect_sync_conflict('sync_contacts', 'test-id', '{"email":"old@test.com"}'::jsonb, '{"email":"new@test.com"}'::jsonb);

-- Test batch upsert
SELECT * FROM batch_upsert_contacts(ARRAY['{"keap_id":"test-1","email":"test1@example.com"}'::jsonb]);

-- Test triggers
UPDATE sync_contacts SET email = 'updated@test.com' WHERE id = 'test-id';
SELECT * FROM sync_queue WHERE entity_id = 'test-id';
```

### Load Testing
```bash
# Insert 10,000 test contacts
pgbench -f load_test.sql -c 10 -j 4 -t 1000

# Monitor performance
SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public';
```

## Rollback Plan
```sql
-- Rollback script
DROP TABLE IF EXISTS sync_audit_log CASCADE;
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS sync_conflicts CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS sync_subscriptions CASCADE;
DROP TABLE IF EXISTS sync_tags CASCADE;
DROP TABLE IF EXISTS sync_orders CASCADE;
DROP TABLE IF EXISTS sync_contacts CASCADE;

DROP FUNCTION IF EXISTS detect_sync_conflict CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_on_update CASCADE;
DROP FUNCTION IF EXISTS batch_upsert_contacts CASCADE;
```

## Security Considerations
- Service role key for backend operations only
- RLS policies enforce data isolation
- Audit logs track all changes
- Sensitive data encrypted at rest
- Connection strings in environment variables
- SQL injection prevention via parameterized queries

## Monitoring & Maintenance
```sql
-- Monitor sync performance
CREATE VIEW sync_health AS
SELECT
    entity_type,
    COUNT(*) as total_records,
    SUM(CASE WHEN sync_status = 'completed' THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) as errors,
    AVG(EXTRACT(EPOCH FROM (last_synced_at - created_at))) as avg_sync_time
FROM sync_status
GROUP BY entity_type;

-- Vacuum and analyze schedule
SELECT cron.schedule('vacuum-analyze', '0 2 * * *', 'VACUUM ANALYZE sync_contacts, sync_orders');
```

## Dependencies
- PostgreSQL 15+
- pg_cron extension for scheduling
- uuid-ossp extension for UUID generation
- Supabase real-time enabled
- Connection pooler (PgBouncer)

## Related PRs/Issues
- Required by: Cloudflare Workers sync implementation
- Required by: Next.js dashboard data queries
- Blocks: Production sync operations
- Related to: Webhook handler implementation

## Additional Context
This database schema is the foundation for reliable bidirectional sync between Keap and Supabase. The design prioritizes data integrity, performance at scale, and comprehensive audit trails. All sync operations must go through these tables to maintain consistency.

## References
- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)