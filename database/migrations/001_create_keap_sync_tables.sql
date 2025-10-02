-- Migration: Create Keap Sync Tables
-- Description: Sets up tables for syncing Keap contacts with Supabase
-- Author: System
-- Date: 2024-01-01

-- Create keap_contacts table
CREATE TABLE IF NOT EXISTS keap_contacts (
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
  -- Computed column for active client status
  is_active_client BOOLEAN GENERATED ALWAYS AS (
    tags @> '[{"name": "Active Client"}]'::jsonb
    OR tags @> '[{"name": "active client"}]'::jsonb
    OR tags @> '[{"name": "Active client"}]'::jsonb
  ) STORED,
  phone_numbers JSONB DEFAULT '[]'::jsonb,
  addresses JSONB DEFAULT '[]'::jsonb,
  date_created TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE,
  keap_last_updated TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'skipped')),
  sync_last_attempt TIMESTAMP WITH TIME ZONE,
  sync_last_success TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create keap_sync_logs table for audit trail
CREATE TABLE IF NOT EXISTS keap_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook', 'manual')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'order', 'tag', 'subscription')),
  entity_id TEXT,
  keap_id TEXT,
  operation TEXT CHECK (operation IN ('create', 'update', 'delete', 'skip')),
  status TEXT CHECK (status IN ('success', 'failed', 'skipped')),
  changes JSONB,
  error_message TEXT,
  error_details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create keap_tags reference table
CREATE TABLE IF NOT EXISTS keap_tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact-tag relationship table
CREATE TABLE IF NOT EXISTS keap_contact_tags (
  contact_id UUID REFERENCES keap_contacts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES keap_tags(id) ON DELETE CASCADE,
  tag_name TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (contact_id, tag_id)
);

-- Create sync configuration table
CREATE TABLE IF NOT EXISTS keap_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO keap_sync_config (config_key, config_value, description) VALUES
  ('sync_enabled', 'true'::jsonb, 'Enable/disable automatic syncing'),
  ('sync_interval_minutes', '60'::jsonb, 'Interval between sync runs in minutes'),
  ('batch_size', '100'::jsonb, 'Number of records to process per batch'),
  ('webhook_enabled', 'false'::jsonb, 'Enable/disable webhook processing'),
  ('last_full_sync', 'null'::jsonb, 'Timestamp of last full sync'),
  ('last_incremental_sync', 'null'::jsonb, 'Timestamp of last incremental sync'),
  ('active_client_tags', '["Active Client", "active client", "Active client"]'::jsonb, 'Tags that indicate active client status')
ON CONFLICT (config_key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_keap_contacts_email ON keap_contacts(email);
CREATE INDEX IF NOT EXISTS idx_keap_contacts_keap_id ON keap_contacts(keap_id);
CREATE INDEX IF NOT EXISTS idx_keap_contacts_is_active ON keap_contacts(is_active_client);
CREATE INDEX IF NOT EXISTS idx_keap_contacts_sync_status ON keap_contacts(sync_status);
CREATE INDEX IF NOT EXISTS idx_keap_contacts_tags ON keap_contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_keap_contacts_updated ON keap_contacts(keap_last_updated);
CREATE INDEX IF NOT EXISTS idx_keap_contacts_lifecycle ON keap_contacts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_keap_sync_logs_entity ON keap_sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_keap_sync_logs_created ON keap_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keap_contact_tags_contact ON keap_contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_keap_contact_tags_tag ON keap_contact_tags(tag_id);

-- Create views for reporting
CREATE OR REPLACE VIEW active_clients AS
SELECT
  id,
  keap_id,
  email,
  given_name,
  family_name,
  company_name,
  lifecycle_stage,
  lead_score,
  tags,
  phone_numbers,
  date_created,
  last_updated
FROM keap_contacts
WHERE is_active_client = true
  AND sync_status = 'synced';

CREATE OR REPLACE VIEW sync_status_summary AS
SELECT
  sync_status,
  COUNT(*) as count,
  MAX(sync_last_success) as last_success,
  MIN(sync_last_attempt) as first_attempt,
  COUNT(CASE WHEN sync_error IS NOT NULL THEN 1 END) as error_count
FROM keap_contacts
GROUP BY sync_status;

CREATE OR REPLACE VIEW recent_sync_activity AS
SELECT
  sync_type,
  entity_type,
  operation,
  status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_activity
FROM keap_sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY sync_type, entity_type, operation, status
ORDER BY last_activity DESC;

CREATE OR REPLACE VIEW client_status_changes AS
SELECT
  l.id,
  l.entity_id,
  c.keap_id,
  c.email,
  c.given_name,
  c.family_name,
  l.changes->>'added_tags' as added_tags,
  l.changes->>'removed_tags' as removed_tags,
  l.changes->>'old_lifecycle_stage' as old_lifecycle_stage,
  l.changes->>'new_lifecycle_stage' as new_lifecycle_stage,
  l.created_at as changed_at
FROM keap_sync_logs l
JOIN keap_contacts c ON c.keap_id = l.keap_id
WHERE l.entity_type = 'contact'
  AND (
    l.changes->>'added_tags' LIKE '%Active Client%'
    OR l.changes->>'removed_tags' LIKE '%Active Client%'
    OR l.changes ? 'old_lifecycle_stage'
  )
ORDER BY l.created_at DESC;

-- Create functions for sync operations
CREATE OR REPLACE FUNCTION update_keap_contact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER keap_contacts_updated_at
  BEFORE UPDATE ON keap_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_keap_contact_updated_at();

CREATE TRIGGER keap_tags_updated_at
  BEFORE UPDATE ON keap_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_keap_contact_updated_at();

CREATE TRIGGER keap_sync_config_updated_at
  BEFORE UPDATE ON keap_sync_config
  FOR EACH ROW
  EXECUTE FUNCTION update_keap_contact_updated_at();

-- Function to get sync statistics
CREATE OR REPLACE FUNCTION get_sync_statistics()
RETURNS TABLE(
  total_contacts BIGINT,
  active_clients BIGINT,
  synced_contacts BIGINT,
  failed_syncs BIGINT,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_contacts,
    COUNT(*) FILTER (WHERE is_active_client = true) as active_clients,
    COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_contacts,
    COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_syncs,
    MAX(sync_last_success) as last_sync,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE sync_status = 'synced')::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0
    END as sync_success_rate
  FROM keap_contacts;
END;
$$ LANGUAGE plpgsql;

-- Function to check if contact is active client
CREATE OR REPLACE FUNCTION is_contact_active_client(contact_tags JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  active_tags TEXT[];
  tag_record JSONB;
BEGIN
  -- Get active client tag list from config
  SELECT config_value::TEXT[]
  INTO active_tags
  FROM keap_sync_config
  WHERE config_key = 'active_client_tags';

  -- Check if any active client tag exists in contact tags
  FOR tag_record IN SELECT * FROM jsonb_array_elements(contact_tags)
  LOOP
    IF tag_record->>'name' = ANY(active_tags) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE keap_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE keap_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE keap_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE keap_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE keap_sync_config ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read access to contacts"
  ON keap_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert to contacts"
  ON keap_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update to contacts"
  ON keap_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read access to sync logs"
  ON keap_sync_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert to sync logs"
  ON keap_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read access to tags"
  ON keap_tags FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to contact tags"
  ON keap_contact_tags FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to sync config"
  ON keap_sync_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to clean old sync logs
CREATE OR REPLACE FUNCTION clean_old_sync_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM keap_sync_logs
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
GRANT ALL ON keap_contacts TO authenticated;
GRANT ALL ON keap_sync_logs TO authenticated;
GRANT ALL ON keap_tags TO authenticated;
GRANT ALL ON keap_contact_tags TO authenticated;
GRANT ALL ON keap_sync_config TO authenticated;
GRANT SELECT ON active_clients TO authenticated;
GRANT SELECT ON sync_status_summary TO authenticated;
GRANT SELECT ON recent_sync_activity TO authenticated;
GRANT SELECT ON client_status_changes TO authenticated;