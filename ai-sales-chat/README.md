# Nutrition Solutions AI Sales Chat

Production-ready AI sales chat system built with:
- **Claude Sonnet 4** (Anthropic) for intelligent responses
- **OpenAI Embeddings** for semantic search
- **Supabase + pgvector** for knowledge base and vector search
- **Cloudflare Workers** for edge deployment

## 📊 Project Status

✅ **COMPLETE - Ready for Deployment**

All core components built:
- ✅ Database schema (7 tables, vector search, analytics views)
- ✅ Data transformation (FAQs, products, testimonials, objections)
- ✅ Data ingestion pipeline (with OpenAI embeddings)
- ✅ Intent classifier (Claude-powered)
- ✅ RAG retriever (semantic search)
- ✅ Testimonial matcher (intelligent social proof)
- ✅ Response generator (brand voice + context-aware)
- ✅ Main Cloudflare Worker (full orchestration)
- ✅ Testing suite
- ✅ Deployment documentation

## 🏗️ Architecture

```
User Message
    ↓
Cloudflare Worker (Edge)
    ↓
┌─────────────────────────────────┐
│ 1. Intent Classifier (Claude)   │
│ 2. RAG Retrieval (Supabase)     │
│ 3. Testimonial Matcher           │
│ 4. Response Generator (Claude)   │
│ 5. Database Logging              │
└─────────────────────────────────┘
    ↓
User Response
```

### Component Details

1. **Intent Classifier**: Determines if message is FACTUAL, EMOTIONAL, OBJECTION, READY_TO_BUY, or CASUAL
2. **RAG Retriever**: Semantic search over knowledge base (FAQs, products, policies, objections)
3. **Testimonial Matcher**: Matches relevant success stories based on demographics, objections, and goals
4. **Response Generator**: Creates brand-aligned responses using Claude with full context
5. **Progressive Profiling**: Builds user profile over time (awareness stage, objections, readiness)

## 🚀 Quick Start

### Prerequisites

1. **Supabase Account** - https://supabase.com (free tier works)
2. **OpenAI API Key** - https://platform.openai.com
3. **Anthropic API Key** - https://console.anthropic.com
4. **Cloudflare Account** - https://dash.cloudflare.com
5. **Node.js 18+**

### Step 1: Clone & Install

```bash
cd /Users/meganharrison/Documents/github/ns\ projects/ns-ai-agent-mastery/ns_Agent_Deployment/ai-sales-chat

# Install dependencies (if not already done)
npm install
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your keys:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for data ingestion)
# SUPABASE_ANON_KEY=your-anon-key (for runtime)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
```

⚠️ **Important**: Use `SUPABASE_SERVICE_ROLE_KEY` for the ingestion script (it needs admin access), but use `SUPABASE_ANON_KEY` in the Cloudflare Worker (safer).

### Step 3: Set Up Supabase Database

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy ALL SQL from `database/schema.sql`
4. Paste and execute

This creates:
- 7 tables (rag_documents, testimonials, conversations, messages, user_profiles, intent_patterns, ab_tests)
- Vector search functions
- Analytics views
- Indexes for performance

### Step 4: Ingest Data

```bash
# This will:
# 1. Load all JSON data files
# 2. Generate OpenAI embeddings
# 3. Upload to Supabase
npm run ingest
```

Expected output:
```
🚀 Starting Nutrition Solutions Data Ingestion

📚 Ingesting FAQs...
  ✓ What's included in the program?
  ✓ How much does it cost?
  ... (14 more)

🛒 Ingesting Products...
  ✓ 5 Meal Plan
  ✓ 10 Meal Plan
  ✓ 15 Meal Plan

⭐ Ingesting Testimonials...
  ✓ William
  ✓ Gino
  ... (4 more)

🛡️ Ingesting Objection Handlers...
  ✓ Price too high
  ... (6 more)

🏢 Ingesting Company Information...
  ✓ Mission
  ✓ USPs
  ✓ Guarantee

🎉 Data ingestion complete!
```

### Step 5: Test the System

```bash
# Run comprehensive tests
npm test
```

This will:
1. Test intent classification
2. Test RAG retrieval
3. Test response quality
4. Verify database connectivity

Expected: All tests pass (6/6)

### Step 6: Deploy to Cloudflare Workers

```bash
# Login to Cloudflare (first time only)
npx wrangler login

# Add secrets (first time only)
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY

# Deploy
npm run deploy
```

After deployment, you'll get a URL like:
```
https://nutrition-solutions-chat.YOUR-SUBDOMAIN.workers.dev
```

### Step 7: Test the API

```bash
# Test with curl
curl -X POST https://your-worker-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What'\''s included in your program?",
    "session_id": "test-session-123"
  }'
```

Expected response:
```json
{
  "message": "You get custom meal plans built for YOUR body...",
  "intent": "FACTUAL",
  "confidence": 0.95,
  "session_id": "test-session-123"
}
```

## 📁 Project Structure

```
ai-sales-chat/
├── data/                    # JSON data files
│   ├── faqs.json
│   ├── products.json
│   ├── testimonials.json
│   ├── objections.json
│   └── company-info.json
├── database/                # Database schemas
│   ├── schema.sql
│   └── functions.sql
├── scripts/                 # Utility scripts
│   ├── ingest-data.js       # Data ingestion with embeddings
│   └── test-search.js       # Test RAG retrieval
├── src/                     # Core application
│   ├── index.js             # Main Cloudflare Worker
│   ├── intent-classifier.js # Intent classification
│   ├── rag-retriever.js     # Semantic search
│   ├── testimonial-matcher.js # Social proof matching
│   └── response-generator.js  # Response generation
├── .env.example
├── package.json
├── wrangler.toml
└── README.md
```

## 🔧 Configuration

### wrangler.toml

Key settings:
```toml
name = "nutrition-solutions-chat"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Secrets are added via wrangler CLI:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
```

### Environment Variables

| Variable | Purpose | Where Used |
|----------|---------|------------|
| `SUPABASE_URL` | Supabase project URL | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access for data ingestion | Scripts only |
| `SUPABASE_ANON_KEY` | Runtime access with RLS | Cloudflare Worker |
| `OPENAI_API_KEY` | For embeddings (text-embedding-3-large) | All |
| `ANTHROPIC_API_KEY` | For Claude Sonnet 4 | All |

## 📊 Database Schema

### Core Tables

1. **rag_documents** - Knowledge base (FAQs, products, policies, objections)
2. **testimonials** - Success stories with objections overcome
3. **conversations** - Chat sessions
4. **messages** - Individual messages
5. **user_profiles** - Progressive user profiling
6. **intent_patterns** - Intent classification training data
7. **ab_tests** - Experimentation tracking

### Vector Search

Uses `pgvector` extension for semantic similarity:
```sql
CREATE EXTENSION vector;
CREATE INDEX ON rag_documents USING ivfflat (embedding vector_cosine_ops);
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

Tests included:
- Intent classification accuracy
- RAG retrieval relevance
- Testimonial matching logic
- Response quality estimation

### Manual Testing Scenarios

After deployment, test these conversations:

1. **Factual Question**
   - "What's included in your program?"
   - Should: Retrieve product info, provide detailed answer

2. **Price Objection**
   - "That's too expensive"
   - Should: Empathize, reframe, show value, offer testimonial

3. **Emotional Opening**
   - "I've tried everything and I'm so frustrated"
   - Should: Validate feelings, show possibility, build hope

4. **Ready to Buy**
   - "How do I sign up?"
   - Should: Provide clear next steps, pricing, process

5. **Time Objection**
   - "I don't have time for this"
   - Should: Address time concern, show flexibility, testimonial

## 📈 Monitoring & Analytics

### Built-in Analytics

Check Supabase SQL Editor:

```sql
-- Conversion funnel
SELECT 
  status,
  COUNT(*) as count,
  AVG(
    (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id)
  ) as avg_messages,
  SUM(revenue_generated) as total_revenue
FROM conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status;

-- Intent distribution
SELECT 
  intent_detected,
  COUNT(*) as count
FROM messages
WHERE role = 'user'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY intent_detected
ORDER BY count DESC;

-- Top retrieved documents
SELECT 
  title,
  COUNT(*) as retrieval_count
FROM rag_documents
WHERE id IN (
  SELECT DISTINCT jsonb_array_elements_text(documents_retrieved::jsonb)::uuid
  FROM messages
  WHERE retrieval_used = true
  AND timestamp > NOW() - INTERVAL '7 days'
)
GROUP BY title
ORDER BY retrieval_count DESC
LIMIT 10;
```

### Cloudflare Dashboard

Monitor:
- Request count
- Error rate
- Latency (p50, p99)
- Cost per request

## 💰 Cost Estimates (Monthly)

Based on 1,000 conversations/month (avg 5 messages each = 5,000 messages):

| Service | Cost |
|---------|------|
| Supabase (Pro) | $25 |
| Cloudflare Workers | $5-10 |
| OpenAI (Embeddings) | $5-15 |
| Anthropic (Claude) | $50-150 |
| **Total** | **$85-200/month** |

**ROI**: If this converts just 1 extra client/month ($297), pays for itself 1.5-3.5x.

For higher volume (10,000 conversations/month):
- Total cost: $300-600/month
- Needs 2-3 extra conversions to break even

## 🔐 Security Best Practices

1. **API Keys**
   - Never commit `.env` to git
   - Use Cloudflare secrets for production
   - Rotate keys quarterly

2. **Rate Limiting**
   - Implement per-session limits
   - Monitor for abuse patterns
   - Add CAPTCHA for suspected bots

3. **Data Privacy**
   - Enable Supabase RLS policies
   - Don't log PII unnecessarily
   - Comply with GDPR/CCPA

4. **Error Handling**
   - Never expose API keys in errors
   - Log errors securely
   - Provide user-friendly fallbacks

## 🐛 Troubleshooting

### "No documents retrieved"

**Cause**: Database not populated
**Fix**: Run `npm run ingest`

### "OpenAI API error: 429"

**Cause**: Rate limit exceeded
**Fix**: Add delay between requests or upgrade OpenAI tier

### "Claude API error: 529"

**Cause**: Anthropic overloaded
**Fix**: Implement retry logic with exponential backoff

### "Supabase RPC error"

**Cause**: `match_documents` function not created
**Fix**: Run `database/functions.sql` in Supabase SQL Editor

### "TypeError: Cannot read property 'length'"

**Cause**: Null/undefined in conversation history
**Fix**: Check database data structure, ensure proper initialization

## 📚 Additional Resources

- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns)
- [Claude API Documentation](https://docs.anthropic.com/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Review deployment guide in project root
3. Check Cloudflare Worker logs
4. Review Supabase logs

## 📄 License

Proprietary - Nutrition Solutions

---

**Built with ❤️ for Nutrition Solutions**
