-- Nutrition Solutions AI Sales Chat - Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: rag_documents
-- Purpose: Store all retrievable knowledge chunks
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  category VARCHAR(100),
  priority INTEGER DEFAULT 5,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for rag_documents
CREATE INDEX IF NOT EXISTS idx_rag_content_type ON rag_documents (content_type);
CREATE INDEX IF NOT EXISTS idx_rag_category ON rag_documents (category);
CREATE INDEX IF NOT EXISTS idx_rag_priority ON rag_documents (priority DESC);
CREATE INDEX IF NOT EXISTS idx_rag_embedding ON rag_documents USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- TABLE 2: testimonials
-- Purpose: Smart matching of social proof to user context
-- ============================================================================

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name VARCHAR(100),
  age INTEGER,
  location VARCHAR(100),
  occupation VARCHAR(100),
  starting_point TEXT,
  results TEXT,
  timeframe VARCHAR(50),
  quote TEXT,
  full_story TEXT,
  objections_overcome JSONB DEFAULT '[]',
  goals_achieved JSONB DEFAULT '[]',
  image_url TEXT,
  video_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for testimonials
CREATE INDEX IF NOT EXISTS idx_testimonials_age ON testimonials (age);
CREATE INDEX IF NOT EXISTS idx_testimonials_objections ON testimonials USING gin (objections_overcome);
CREATE INDEX IF NOT EXISTS idx_testimonials_goals ON testimonials USING gin (goals_achieved);
CREATE INDEX IF NOT EXISTS idx_testimonials_embedding ON testimonials USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- TABLE 3: conversations
-- Purpose: Store full conversation history for learning and context
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(100),
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  conversion_outcome VARCHAR(100),
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations (session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations (status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations (last_message_at DESC);

-- ============================================================================
-- TABLE 4: messages
-- Purpose: Individual messages within conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  intent_detected VARCHAR(100),
  retrieval_used BOOLEAN DEFAULT FALSE,
  documents_retrieved JSONB DEFAULT '[]',
  sentiment_score DECIMAL(3,2),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_intent ON messages (intent_detected);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages (role);

-- ============================================================================
-- TABLE 5: user_profiles
-- Purpose: Progressive profiling - learn about users over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  name VARCHAR(100),
  
  -- Inferred/stated attributes
  age_range VARCHAR(20),
  primary_goal VARCHAR(100),
  current_weight INTEGER,
  target_weight INTEGER,
  timeline VARCHAR(50),
  
  -- Behavioral tracking
  objections_raised JSONB DEFAULT '[]',
  stage_of_awareness VARCHAR(50) DEFAULT 'unaware',
  decision_readiness INTEGER DEFAULT 5,
  engagement_score INTEGER DEFAULT 5,
  
  -- Preferences
  budget_indicated DECIMAL(10,2),
  schedule_constraints TEXT,
  dietary_restrictions JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_profiles_session ON user_profiles (session_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stage ON user_profiles (stage_of_awareness);
CREATE INDEX IF NOT EXISTS idx_profiles_readiness ON user_profiles (decision_readiness DESC);

-- ============================================================================
-- TABLE 6: intent_patterns
-- Purpose: Train intent classifier over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS intent_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_message TEXT NOT NULL,
  detected_intent VARCHAR(100),
  confidence_score DECIMAL(3,2),
  human_verified BOOLEAN DEFAULT FALSE,
  correct_intent VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for intent_patterns
CREATE INDEX IF NOT EXISTS idx_intent_patterns_intent ON intent_patterns (detected_intent);
CREATE INDEX IF NOT EXISTS idx_intent_patterns_verified ON intent_patterns (human_verified);

-- ============================================================================
-- TABLE 7: ab_tests (Optional)
-- Purpose: Test different response strategies
-- ============================================================================

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name VARCHAR(100),
  variant VARCHAR(50),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ab_tests
CREATE INDEX IF NOT EXISTS idx_ab_tests_name ON ab_tests (test_name);
CREATE INDEX IF NOT EXISTS idx_ab_tests_converted ON ab_tests (converted);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing API access)
CREATE POLICY "Allow API access to rag_documents" ON rag_documents FOR ALL USING (true);
CREATE POLICY "Allow API access to testimonials" ON testimonials FOR ALL USING (true);
CREATE POLICY "Allow API access to conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow API access to messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow API access to user_profiles" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Allow API access to intent_patterns" ON intent_patterns FOR ALL USING (true);
CREATE POLICY "Allow API access to ab_tests" ON ab_tests FOR ALL USING (true);

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- Conversion funnel view
CREATE OR REPLACE VIEW conversion_funnel AS
SELECT 
  status,
  COUNT(*) as conversation_count,
  AVG((
    SELECT COUNT(*) 
    FROM messages 
    WHERE conversation_id = conversations.id
  )) as avg_messages_per_conversation,
  SUM(revenue_generated) as total_revenue,
  AVG(revenue_generated) as avg_revenue
FROM conversations
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY status;

-- Intent distribution view
CREATE OR REPLACE VIEW intent_distribution AS
SELECT 
  intent_detected,
  COUNT(*) as message_count,
  AVG(sentiment_score) as avg_sentiment,
  COUNT(DISTINCT conversation_id) as unique_conversations
FROM messages
WHERE role = 'user'
  AND timestamp > NOW() - INTERVAL '7 days'
  AND intent_detected IS NOT NULL
GROUP BY intent_detected
ORDER BY message_count DESC;

-- RAG effectiveness view
CREATE OR REPLACE VIEW rag_effectiveness AS
SELECT 
  retrieval_used,
  COUNT(*) as message_count,
  AVG((
    SELECT sentiment_score 
    FROM messages m2 
    WHERE m2.conversation_id = m1.conversation_id 
      AND m2.timestamp > m1.timestamp 
      AND m2.role = 'user'
    ORDER BY m2.timestamp ASC 
    LIMIT 1
  )) as avg_next_sentiment
FROM messages m1
WHERE role = 'assistant'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY retrieval_used;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update last_message_at in conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.timestamp
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Auto-update updated_at in user_profiles
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_on_change
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_profile_timestamp();

-- ============================================================================
-- Completion Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Nutrition Solutions AI Chat schema created successfully!';
  RAISE NOTICE 'Next step: Run functions.sql to create vector search functions.';
END $$;
