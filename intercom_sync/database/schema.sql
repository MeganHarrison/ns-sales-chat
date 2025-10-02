-- Intercom to Supabase Data Sync Schema
-- This schema stores Intercom conversation data in a structured format

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Intercom Admins (Support agents)
CREATE TABLE IF NOT EXISTS intercom_admins (
    admin_id TEXT PRIMARY KEY,
    type TEXT,
    name TEXT,
    email TEXT,
    job_title TEXT,
    away_mode_enabled BOOLEAN DEFAULT FALSE,
    away_mode_reassign BOOLEAN DEFAULT FALSE,
    has_inbox_seat BOOLEAN DEFAULT TRUE,
    team_ids TEXT[],
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intercom Users/Contacts
CREATE TABLE IF NOT EXISTS intercom_users (
    user_id TEXT PRIMARY KEY,
    type TEXT CHECK (type IN ('user', 'contact', 'lead', 'visitor')),
    external_id TEXT,
    email TEXT,
    phone TEXT,
    name TEXT,
    avatar_url TEXT,
    pseudonym TEXT,
    location_country TEXT,
    location_region TEXT,
    location_city TEXT,
    user_agent_data JSONB,
    custom_attributes JSONB,
    segments TEXT[],
    tags TEXT[],
    companies JSONB,
    social_profiles JSONB,
    unsubscribed_from_emails BOOLEAN DEFAULT FALSE,
    marked_email_as_spam BOOLEAN DEFAULT FALSE,
    has_hard_bounced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    signed_up_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    last_email_opened_at TIMESTAMPTZ,
    last_email_clicked_at TIMESTAMPTZ,
    browser TEXT,
    browser_version TEXT,
    browser_language TEXT,
    os TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intercom Conversations
CREATE TABLE IF NOT EXISTS intercom_conversations (
    conversation_id TEXT PRIMARY KEY,
    type TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    waiting_since TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    source_type TEXT,
    source_id TEXT,
    source_delivered_as TEXT,
    source_subject TEXT,
    source_body TEXT,
    source_author_type TEXT,
    source_author_id TEXT,
    source_author_name TEXT,
    source_author_email TEXT,
    source_url TEXT,
    source_attachments JSONB,
    contacts TEXT[], -- Array of user_ids
    teammates TEXT[], -- Array of admin_ids
    first_contact_reply_at TIMESTAMPTZ,
    first_contact_reply_type TEXT,
    admin_assignee_id TEXT REFERENCES intercom_admins(admin_id),
    team_assignee_id TEXT,
    open BOOLEAN DEFAULT TRUE,
    state TEXT CHECK (state IN ('open', 'closed', 'snoozed')),
    read BOOLEAN DEFAULT FALSE,
    priority TEXT CHECK (priority IN ('priority', 'not_priority')),
    sla_applied JSONB,
    statistics JSONB, -- time_to_assignment, time_to_admin_reply, etc.
    conversation_rating JSONB,
    tags TEXT[],
    custom_attributes JSONB,
    topics JSONB,
    ticket_id TEXT,
    linked_objects JSONB,
    ai_agent_participated BOOLEAN DEFAULT FALSE,
    ai_agent JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_admin_assignee FOREIGN KEY (admin_assignee_id)
        REFERENCES intercom_admins(admin_id) ON DELETE SET NULL
);

-- Intercom Conversation Parts (Messages)
CREATE TABLE IF NOT EXISTS intercom_messages (
    message_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    part_type TEXT,
    body TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    notified_at TIMESTAMPTZ,
    assigned_to_id TEXT,
    assigned_to_type TEXT,
    author_id TEXT,
    author_type TEXT CHECK (author_type IN ('admin', 'user', 'contact', 'bot', 'team', 'lead', 'visitor')),
    author_name TEXT,
    author_email TEXT,
    attachments JSONB,
    external_id TEXT,
    redacted BOOLEAN DEFAULT FALSE,
    message_index INTEGER, -- Order within conversation
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_conversation FOREIGN KEY (conversation_id)
        REFERENCES intercom_conversations(conversation_id) ON DELETE CASCADE
);

-- Intercom Tags
CREATE TABLE IF NOT EXISTS intercom_tags (
    tag_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Tags Junction Table
CREATE TABLE IF NOT EXISTS intercom_conversation_tags (
    conversation_id TEXT,
    tag_id TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by_id TEXT,
    applied_by_type TEXT,
    PRIMARY KEY (conversation_id, tag_id),
    CONSTRAINT fk_conversation_tag_conv FOREIGN KEY (conversation_id)
        REFERENCES intercom_conversations(conversation_id) ON DELETE CASCADE,
    CONSTRAINT fk_conversation_tag_tag FOREIGN KEY (tag_id)
        REFERENCES intercom_tags(tag_id) ON DELETE CASCADE
);

-- Sync Logs for tracking sync operations
CREATE TABLE IF NOT EXISTS intercom_sync_logs (
    sync_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sync_type TEXT CHECK (sync_type IN ('full', 'incremental', 'webhook', 'manual')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    conversations_synced INTEGER DEFAULT 0,
    messages_synced INTEGER DEFAULT 0,
    users_synced INTEGER DEFAULT 0,
    admins_synced INTEGER DEFAULT 0,
    tags_synced INTEGER DEFAULT 0,
    errors JSONB,
    last_cursor TEXT, -- For pagination resume
    sync_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Events Log
CREATE TABLE IF NOT EXISTS intercom_webhook_events (
    event_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    topic TEXT NOT NULL,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON intercom_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON intercom_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_state ON intercom_conversations(state);
CREATE INDEX IF NOT EXISTS idx_conversations_open ON intercom_conversations(open);
CREATE INDEX IF NOT EXISTS idx_conversations_admin_assignee ON intercom_conversations(admin_assignee_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contacts ON intercom_conversations USING GIN(contacts);
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON intercom_conversations USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON intercom_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON intercom_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON intercom_messages(author_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON intercom_users(email);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON intercom_users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON intercom_users(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON intercom_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON intercom_sync_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON intercom_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON intercom_webhook_events(event_type);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_intercom_admins_updated_at BEFORE UPDATE ON intercom_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intercom_users_updated_at BEFORE UPDATE ON intercom_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intercom_conversations_updated_at BEFORE UPDATE ON intercom_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intercom_messages_updated_at BEFORE UPDATE ON intercom_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (adjust based on your security requirements)
ALTER TABLE intercom_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_webhook_events ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your needs)
-- Allow service role full access
CREATE POLICY "Service role has full access to conversations" ON intercom_conversations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to messages" ON intercom_messages
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to users" ON intercom_users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to admins" ON intercom_admins
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to tags" ON intercom_tags
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to conversation_tags" ON intercom_conversation_tags
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to sync_logs" ON intercom_sync_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to webhook_events" ON intercom_webhook_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');