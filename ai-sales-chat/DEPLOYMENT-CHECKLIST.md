# Deployment Checklist

Use this checklist to deploy the Nutrition Solutions AI Sales Chat system.

## ☐ Phase 1: Prerequisites (30 minutes)

### Accounts & API Keys

- [ ] Supabase account created (https://supabase.com)
- [ ] Supabase project created
- [ ] OpenAI account created (https://platform.openai.com)
- [ ] OpenAI API key obtained
- [ ] Anthropic account created (https://console.anthropic.com)
- [ ] Anthropic API key obtained
- [ ] Cloudflare account created (https://dash.cloudflare.com)
- [ ] Cloudflare Workers enabled
- [ ] Node.js 18+ installed locally

### Copy This Info:

```
SUPABASE_URL: _______________________
SUPABASE_SERVICE_ROLE_KEY: _______________________
SUPABASE_ANON_KEY: _______________________
OPENAI_API_KEY: _______________________
ANTHROPIC_API_KEY: _______________________
```

## ☐ Phase 2: Local Setup (15 minutes)

- [ ] Open terminal
- [ ] Navigate to project directory:
  ```bash
  cd "/Users/meganharrison/Documents/github/ns projects/ns-ai-agent-mastery/ns_Agent_Deployment/ai-sales-chat"
  ```
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Create `.env` file:
  ```bash
  cp .env.example .env
  ```
- [ ] Edit `.env` with your API keys (use VS Code or any text editor)
- [ ] Verify `.env` has all 5 keys filled in

## ☐ Phase 3: Database Setup (20 minutes)

### Create Tables

- [ ] Open Supabase dashboard
- [ ] Go to SQL Editor
- [ ] Open `database/schema.sql` in VS Code
- [ ] Copy ALL contents
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run"
- [ ] Verify: No errors in output
- [ ] Check: 7 tables created in Table Editor

### Create Functions

- [ ] Open `database/functions.sql` in VS Code
- [ ] Copy ALL contents
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run"
- [ ] Verify: Functions created successfully

### Enable pgvector

- [ ] In Supabase SQL Editor, run:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] Verify: "Success. No rows returned"

## ☐ Phase 4: Data Ingestion (15 minutes)

- [ ] Open terminal in project directory
- [ ] Run ingestion script:
  ```bash
  npm run ingest
  ```
- [ ] Wait for completion (may take 5-10 minutes)
- [ ] Verify output shows:
  - [ ] ✅ FAQs: 16 succeeded
  - [ ] ✅ Products: 3 succeeded
  - [ ] ✅ Testimonials: 6 succeeded
  - [ ] ✅ Objections: 7 succeeded
  - [ ] ✅ Company Info: 3 succeeded
- [ ] Check Supabase Table Editor:
  - [ ] `rag_documents` has ~30 rows
  - [ ] `testimonials` has 6 rows

## ☐ Phase 5: Testing (10 minutes)

- [ ] Run test suite:
  ```bash
  npm test
  ```
- [ ] Verify: All 6 tests pass
- [ ] Check output for:
  - [ ] Intent classification working
  - [ ] Documents retrieved successfully
  - [ ] No API errors

### If Tests Fail:

- [ ] Check API keys in `.env`
- [ ] Verify database was populated (run `npm run ingest` again)
- [ ] Check Supabase functions exist
- [ ] Review error messages in terminal

## ☐ Phase 6: Cloudflare Deployment (20 minutes)

### First-Time Setup

- [ ] Login to Cloudflare:
  ```bash
  npx wrangler login
  ```
- [ ] Browser opens → Authorize Wrangler
- [ ] Return to terminal, verify "Successfully logged in"

### Add Secrets

- [ ] Add Supabase URL:
  ```bash
  npx wrangler secret put SUPABASE_URL
  ```
  Enter: `https://your-project.supabase.co`

- [ ] Add Supabase Anon Key:
  ```bash
  npx wrangler secret put SUPABASE_ANON_KEY
  ```
  Enter: `your-anon-key` (from .env)

- [ ] Add OpenAI Key:
  ```bash
  npx wrangler secret put OPENAI_API_KEY
  ```
  Enter: `sk-...` (from .env)

- [ ] Add Anthropic Key:
  ```bash
  npx wrangler secret put ANTHROPIC_API_KEY
  ```
  Enter: `sk-ant-...` (from .env)

### Deploy

- [ ] Run deployment:
  ```bash
  npm run deploy
  ```
- [ ] Wait for deployment (1-2 minutes)
- [ ] Copy your Worker URL from output:
  ```
  https://nutrition-solutions-chat.YOUR-SUBDOMAIN.workers.dev
  ```
- [ ] Save this URL: _______________________

## ☐ Phase 7: Production Testing (10 minutes)

### Test 1: Factual Question

- [ ] Run curl command:
  ```bash
  curl -X POST https://YOUR-WORKER-URL.workers.dev \
    -H "Content-Type: application/json" \
    -d '{"message":"What'\''s included in your program?","session_id":"test-1"}'
  ```
- [ ] Verify: Response includes product details
- [ ] Check: `intent` = "FACTUAL"

### Test 2: Objection Handling

- [ ] Run curl command:
  ```bash
  curl -X POST https://YOUR-WORKER-URL.workers.dev \
    -H "Content-Type: application/json" \
    -d '{"message":"That'\''s too expensive","session_id":"test-2"}'
  ```
- [ ] Verify: Response addresses price concern
- [ ] Check: `intent` = "OBJECTION"

### Test 3: Emotional Support

- [ ] Run curl command:
  ```bash
  curl -X POST https://YOUR-WORKER-URL.workers.dev \
    -H "Content-Type: application/json" \
    -d '{"message":"I'\''ve tried everything and I'\''m so frustrated","session_id":"test-3"}'
  ```
- [ ] Verify: Response is empathetic
- [ ] Check: `intent` = "EMOTIONAL"

### Test 4: Multi-turn Conversation

- [ ] Run first message:
  ```bash
  curl -X POST https://YOUR-WORKER-URL.workers.dev \
    -H "Content-Type: application/json" \
    -d '{"message":"Tell me about your program","session_id":"test-4"}'
  ```
- [ ] Run follow-up:
  ```bash
  curl -X POST https://YOUR-WORKER-URL.workers.dev \
    -H "Content-Type: application/json" \
    -d '{"message":"How much does it cost?","session_id":"test-4"}'
  ```
- [ ] Verify: Second response references first message context

## ☐ Phase 8: Frontend Integration (Optional)

If you want to add the chat widget to your website:

- [ ] Copy `chat-widget.html` to your website
- [ ] Update API endpoint in the JavaScript:
  ```javascript
  const API_ENDPOINT = 'https://YOUR-WORKER-URL.workers.dev';
  ```
- [ ] Customize styling to match your brand
- [ ] Test on your website
- [ ] Verify CORS is working (should be by default)

## ☐ Phase 9: Monitoring Setup (15 minutes)

### Cloudflare Dashboard

- [ ] Open Cloudflare dashboard
- [ ] Navigate to Workers & Pages
- [ ] Click on `nutrition-solutions-chat`
- [ ] Check "Metrics" tab
- [ ] Verify requests are logged

### Supabase Dashboard

- [ ] Open Supabase dashboard
- [ ] Go to Table Editor
- [ ] Check `conversations` table for new rows
- [ ] Check `messages` table for logged messages
- [ ] Run analytics query:
  ```sql
  SELECT 
    intent_detected,
    COUNT(*) as count
  FROM messages
  WHERE role = 'user'
  GROUP BY intent_detected;
  ```
- [ ] Verify: Intent distribution looks reasonable

## ☐ Phase 10: Documentation & Handoff

- [ ] Save all API keys in password manager
- [ ] Document Worker URL
- [ ] Share access with team (if applicable)
- [ ] Create internal wiki/doc with:
  - [ ] How to access Cloudflare dashboard
  - [ ] How to access Supabase dashboard
  - [ ] How to view analytics
  - [ ] How to update data (re-run ingestion)

## 📊 Success Criteria

Your deployment is successful if:

- ✅ All 6 test scenarios pass
- ✅ Cloudflare Worker responds in <2 seconds
- ✅ Supabase logs conversations
- ✅ Intent classification is accurate
- ✅ Responses are on-brand
- ✅ No errors in Cloudflare logs
- ✅ No errors in Supabase logs

## 🚨 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "No documents retrieved" | Run `npm run ingest` again |
| "OpenAI API error: 429" | Wait 60 seconds, try again |
| "Claude API error: 529" | Anthropic overloaded, retry |
| "Supabase RPC error" | Check functions.sql was run |
| CORS error | Should work by default, check Cloudflare logs |
| Empty responses | Check API keys in Cloudflare secrets |

## 🎉 You're Done!

Once all checkboxes are complete, your AI sales chat is live and ready to convert visitors into clients.

**Next Steps:**
1. Monitor performance for first 100 conversations
2. Review conversation logs weekly
3. Update data as needed (new FAQs, testimonials, etc.)
4. Iterate on system prompts based on performance

**Support:**
- Check README.md for detailed documentation
- Review DEPLOYMENT-GUIDE.md for troubleshooting
- Check Cloudflare Worker logs for errors
- Review Supabase logs for database issues

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Worker URL:** _______________
