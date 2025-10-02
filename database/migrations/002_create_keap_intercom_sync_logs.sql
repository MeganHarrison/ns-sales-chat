-- Migration: Create keap_intercom_sync_logs table
-- Purpose: Track contact sync operations between Keap and Intercom

CREATE TABLE IF NOT EXISTS keap_intercom_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keap_contact_id TEXT NOT NULL,
  intercom_contact_id TEXT,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'failed', 'skipped')),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('keap_to_intercom', 'intercom_to_keap')),
  error_message TEXT,
  synced_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_keap_intercom_sync_logs_keap_contact_id
  ON keap_intercom_sync_logs(keap_contact_id);

CREATE INDEX IF NOT EXISTS idx_keap_intercom_sync_logs_intercom_contact_id
  ON keap_intercom_sync_logs(intercom_contact_id);

CREATE INDEX IF NOT EXISTS idx_keap_intercom_sync_logs_sync_status
  ON keap_intercom_sync_logs(sync_status);

CREATE INDEX IF NOT EXISTS idx_keap_intercom_sync_logs_synced_at
  ON keap_intercom_sync_logs(synced_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_keap_intercom_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_keap_intercom_sync_logs_updated_at
  BEFORE UPDATE ON keap_intercom_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_keap_intercom_sync_logs_updated_at();

-- Comment on table
COMMENT ON TABLE keap_intercom_sync_logs IS 'Logs all contact sync operations between Keap CRM and Intercom';
COMMENT ON COLUMN keap_intercom_sync_logs.keap_contact_id IS 'Keap contact ID (stored as text for flexibility)';
COMMENT ON COLUMN keap_intercom_sync_logs.intercom_contact_id IS 'Intercom contact ID';
COMMENT ON COLUMN keap_intercom_sync_logs.sync_status IS 'Status of the sync operation';
COMMENT ON COLUMN keap_intercom_sync_logs.sync_direction IS 'Direction of data flow';
COMMENT ON COLUMN keap_intercom_sync_logs.error_message IS 'Error details if sync failed';
