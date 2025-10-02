-- ==============================================================================
-- Keap-Supabase Sync Database Schema
-- ==============================================================================
-- This file contains all sync-related tables, indexes, and constraints
-- for the bidirectional Keap-Supabase synchronization system

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS sync_conflicts CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS sync_subscriptions CASCADE;
DROP TABLE IF EXISTS sync_orders CASCADE;
DROP TABLE IF EXISTS sync_tags CASCADE;
DROP TABLE IF EXISTS sync_contacts CASCADE;

-- ==============================================================================
-- SYNC CONTACTS TABLE
-- ==============================================================================
-- Stores contact data synchronized from Keap CRM
CREATE TABLE sync_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keap_id VARCHAR NOT NULL UNIQUE, -- Keap contact ID
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    phone VARCHAR,
    tags JSONB DEFAULT '[]'::jsonb, -- Array of tag names/IDs
    custom_fields JSONB DEFAULT '{}'::jsonb, -- Custom field data
    keap_created_date TIMESTAMP,
    keap_last_updated TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for sync_contacts
CREATE INDEX idx_sync_contacts_keap_id ON sync_contacts(keap_id);
CREATE INDEX idx_sync_contacts_email ON sync_contacts(email);
CREATE INDEX idx_sync_contacts_last_synced ON sync_contacts(last_synced_at);
CREATE INDEX idx_sync_contacts_updated_at ON sync_contacts(updated_at);
CREATE INDEX idx_sync_contacts_tags ON sync_contacts USING GIN(tags);

-- ==============================================================================
-- SYNC ORDERS TABLE
-- ==============================================================================
-- Stores order data synchronized from Keap CRM
CREATE TABLE sync_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keap_id VARCHAR NOT NULL UNIQUE, -- Keap order ID
    contact_keap_id VARCHAR NOT NULL, -- Reference to Keap contact
    order_title VARCHAR,
    order_total DECIMAL(10, 2),
    order_status VARCHAR,
    order_date TIMESTAMP,
    products JSONB DEFAULT '[]'::jsonb, -- Array of product details
    keap_created_date TIMESTAMP,
    keap_last_updated TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key to sync_contacts
    CONSTRAINT fk_sync_orders_contact 
        FOREIGN KEY (contact_keap_id) 
        REFERENCES sync_contacts(keap_id) 
        ON DELETE CASCADE
);

-- Create indexes for sync_orders
CREATE INDEX idx_sync_orders_keap_id ON sync_orders(keap_id);
CREATE INDEX idx_sync_orders_contact ON sync_orders(contact_keap_id);
CREATE INDEX idx_sync_orders_date ON sync_orders(order_date);
CREATE INDEX idx_sync_orders_status ON sync_orders(order_status);
CREATE INDEX idx_sync_orders_last_synced ON sync_orders(last_synced_at);
CREATE INDEX idx_sync_orders_total ON sync_orders(order_total);

-- ==============================================================================
-- SYNC TAGS TABLE
-- ==============================================================================
-- Stores tag data synchronized from Keap CRM
CREATE TABLE sync_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keap_id VARCHAR NOT NULL UNIQUE, -- Keap tag ID
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    keap_created_date TIMESTAMP,
    keap_last_updated TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for sync_tags
CREATE INDEX idx_sync_tags_keap_id ON sync_tags(keap_id);
CREATE INDEX idx_sync_tags_name ON sync_tags(name);
CREATE INDEX idx_sync_tags_category ON sync_tags(category);
CREATE INDEX idx_sync_tags_last_synced ON sync_tags(last_synced_at);

-- ==============================================================================
-- SYNC SUBSCRIPTIONS TABLE
-- ==============================================================================
-- Stores subscription/recurring order data synchronized from Keap CRM
CREATE TABLE sync_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keap_id VARCHAR NOT NULL UNIQUE, -- Keap subscription ID
    contact_keap_id VARCHAR NOT NULL, -- Reference to Keap contact
    product_id VARCHAR,
    status VARCHAR NOT NULL,
    frequency VARCHAR, -- billing frequency
    amount DECIMAL(10, 2),
    next_charge_date TIMESTAMP,
    keap_created_date TIMESTAMP,
    keap_last_updated TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key to sync_contacts
    CONSTRAINT fk_sync_subscriptions_contact 
        FOREIGN KEY (contact_keap_id) 
        REFERENCES sync_contacts(keap_id) 
        ON DELETE CASCADE
);

-- Create indexes for sync_subscriptions
CREATE INDEX idx_sync_subscriptions_keap_id ON sync_subscriptions(keap_id);
CREATE INDEX idx_sync_subscriptions_contact ON sync_subscriptions(contact_keap_id);
CREATE INDEX idx_sync_subscriptions_status ON sync_subscriptions(status);
CREATE INDEX idx_sync_subscriptions_next_charge ON sync_subscriptions(next_charge_date);
CREATE INDEX idx_sync_subscriptions_last_synced ON sync_subscriptions(last_synced_at);

-- ==============================================================================
-- SYNC STATUS TABLE
-- ==============================================================================
-- Tracks synchronization status for all entities
CREATE TABLE sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR NOT NULL, -- 'contact', 'order', 'tag', 'subscription'
    entity_id VARCHAR NOT NULL, -- The primary entity ID (usually Keap ID)
    keap_id VARCHAR NOT NULL, -- Keap entity ID
    supabase_id UUID, -- Supabase table primary key
    last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sync_direction VARCHAR NOT NULL DEFAULT 'keap_to_supabase', 
    -- 'keap_to_supabase', 'supabase_to_keap', 'bidirectional'
    conflict_status VARCHAR NOT NULL DEFAULT 'none',
    -- 'none', 'pending', 'resolved'
    sync_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint on entity type and ID
    CONSTRAINT uk_sync_status_entity UNIQUE (entity_type, entity_id)
);

-- Create indexes for sync_status
CREATE INDEX idx_sync_status_entity_type ON sync_status(entity_type);
CREATE INDEX idx_sync_status_keap_id ON sync_status(keap_id);
CREATE INDEX idx_sync_status_last_synced ON sync_status(last_synced_at);
CREATE INDEX idx_sync_status_conflict_status ON sync_status(conflict_status);
CREATE INDEX idx_sync_status_sync_direction ON sync_status(sync_direction);

-- ==============================================================================
-- SYNC CONFLICTS TABLE
-- ==============================================================================
-- Tracks data conflicts that require resolution
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR NOT NULL,
    entity_id VARCHAR NOT NULL,
    keap_data JSONB NOT NULL, -- Data from Keap
    supabase_data JSONB NOT NULL, -- Data from Supabase
    conflict_fields JSONB NOT NULL, -- Array of field names in conflict
    resolution_strategy VARCHAR NOT NULL DEFAULT 'manual',
    -- 'keap_wins', 'supabase_wins', 'manual', 'merge'
    resolved_at TIMESTAMP,
    resolved_by UUID, -- User who resolved the conflict
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key to user_profiles for resolved_by
    CONSTRAINT fk_sync_conflicts_resolved_by
        FOREIGN KEY (resolved_by)
        REFERENCES user_profiles(id)
        ON DELETE SET NULL
);

-- Create indexes for sync_conflicts
CREATE INDEX idx_sync_conflicts_entity_type ON sync_conflicts(entity_type);
CREATE INDEX idx_sync_conflicts_entity_id ON sync_conflicts(entity_id);
CREATE INDEX idx_sync_conflicts_resolved_at ON sync_conflicts(resolved_at);
CREATE INDEX idx_sync_conflicts_resolution_strategy ON sync_conflicts(resolution_strategy);
CREATE INDEX idx_sync_conflicts_created_at ON sync_conflicts(created_at);

-- ==============================================================================
-- UPDATE TRIGGERS
-- ==============================================================================
-- Auto-update updated_at timestamps

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all sync tables
CREATE TRIGGER update_sync_contacts_updated_at
    BEFORE UPDATE ON sync_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_updated_at();

CREATE TRIGGER update_sync_orders_updated_at
    BEFORE UPDATE ON sync_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_updated_at();

CREATE TRIGGER update_sync_tags_updated_at
    BEFORE UPDATE ON sync_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_updated_at();

CREATE TRIGGER update_sync_subscriptions_updated_at
    BEFORE UPDATE ON sync_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_updated_at();

CREATE TRIGGER update_sync_status_updated_at
    BEFORE UPDATE ON sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_updated_at();

CREATE TRIGGER update_sync_conflicts_updated_at
    BEFORE UPDATE ON sync_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all sync tables
ALTER TABLE sync_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Policies for sync_contacts
CREATE POLICY "Admins can access all sync contacts"
ON sync_contacts FOR ALL
USING (is_admin());

CREATE POLICY "Service role can access all sync contacts"
ON sync_contacts FOR ALL
USING (auth.role() = 'service_role');

-- Policies for sync_orders
CREATE POLICY "Admins can access all sync orders"
ON sync_orders FOR ALL
USING (is_admin());

CREATE POLICY "Service role can access all sync orders"
ON sync_orders FOR ALL
USING (auth.role() = 'service_role');

-- Policies for sync_tags
CREATE POLICY "Admins can access all sync tags"
ON sync_tags FOR ALL
USING (is_admin());

CREATE POLICY "Service role can access all sync tags"
ON sync_tags FOR ALL
USING (auth.role() = 'service_role');

-- Policies for sync_subscriptions
CREATE POLICY "Admins can access all sync subscriptions"
ON sync_subscriptions FOR ALL
USING (is_admin());

CREATE POLICY "Service role can access all sync subscriptions"
ON sync_subscriptions FOR ALL
USING (auth.role() = 'service_role');

-- Policies for sync_status
CREATE POLICY "Admins can access all sync status"
ON sync_status FOR ALL
USING (is_admin());

CREATE POLICY "Service role can access all sync status"
ON sync_status FOR ALL
USING (auth.role() = 'service_role');

-- Policies for sync_conflicts
CREATE POLICY "Admins can access all sync conflicts"
ON sync_conflicts FOR ALL
USING (is_admin());

CREATE POLICY "Service role can access all sync conflicts"
ON sync_conflicts FOR ALL
USING (auth.role() = 'service_role');

-- ==============================================================================
-- REALTIME CONFIGURATION
-- ==============================================================================
-- Enable realtime on sync tables for live dashboard updates

-- Enable replica identity for realtime
ALTER TABLE sync_contacts REPLICA IDENTITY FULL;
ALTER TABLE sync_orders REPLICA IDENTITY FULL;
ALTER TABLE sync_tags REPLICA IDENTITY FULL;
ALTER TABLE sync_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE sync_status REPLICA IDENTITY FULL;
ALTER TABLE sync_conflicts REPLICA IDENTITY FULL;

-- ==============================================================================
-- SYNC SCHEMA COMPLETE
-- ==============================================================================

-- The sync database schema is now fully configured with:
-- ✅ All sync tables created with proper relationships and constraints
-- ✅ Comprehensive indexes for performance optimization  
-- ✅ Auto-updating timestamps with triggers
-- ✅ Row Level Security policies for admin and service access
-- ✅ Realtime configuration for live dashboard updates
-- ✅ Foreign key relationships maintained with existing tables
-- ✅ JSONB fields for flexible data storage (tags, custom fields, products)
-- ✅ Audit trail with sync status and conflict tracking