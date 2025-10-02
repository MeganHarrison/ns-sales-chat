# Keap-Intercom Contact Sync Worker

Bidirectional contact synchronization between Keap and Intercom, automatically updating Intercom contacts with Keap contact IDs as `external_id`.

## Features

- ✅ **Automatic Webhook Sync** - Listens for Keap contact events and syncs to Intercom
- ✅ **Smart Matching** - Finds existing Intercom contacts by email before creating duplicates
- ✅ **External ID Linking** - Sets Intercom `external_id` to Keap contact ID for easy reference
- ✅ **Manual Sync** - API endpoints for on-demand single or batch sync
- ✅ **Sync Logging** - Tracks all sync operations in Supabase
- ✅ **Error Handling** - Comprehensive error handling and retry logic

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Add to your `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"

# Secrets (use wrangler secret put)
# INTERCOM_ACCESS_TOKEN
# KEAP_API_KEY
# KEAP_WEBHOOK_SECRET
# SUPABASE_URL
# SUPABASE_SERVICE_KEY
```

Set secrets:

```bash
wrangler secret put INTERCOM_ACCESS_TOKEN
wrangler secret put KEAP_API_KEY
wrangler secret put KEAP_WEBHOOK_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
```

### 3. Create Supabase Table

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE keap_intercom_sync_logs (
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

CREATE INDEX idx_keap_intercom_sync_logs_keap_contact_id ON keap_intercom_sync_logs(keap_contact_id);
CREATE INDEX idx_keap_intercom_sync_logs_intercom_contact_id ON keap_intercom_sync_logs(intercom_contact_id);
CREATE INDEX idx_keap_intercom_sync_logs_sync_status ON keap_intercom_sync_logs(sync_status);
```

### 4. Deploy Worker

```bash
wrangler deploy
```

### 5. Configure Keap Webhook

1. Go to Keap Settings > Webhooks
2. Create new webhook:
   - **URL**: `https://your-worker.workers.dev/webhook/keap`
   - **Events**: Contact created, Contact updated
   - **Secret**: Use the same value as `KEAP_WEBHOOK_SECRET`

## API Endpoints

### POST /webhook/keap

Keap webhook endpoint (automatic sync)

**Request**: Sent by Keap automatically
**Response**:
```json
{
  "success": true,
  "action": "created|updated|linked",
  "intercomContactId": "...",
  "keapContactId": 12345
}
```

### POST /sync/contact

Manual single contact sync

**Request**:
```json
{
  "keap_contact_id": 12345
}
```

**Response**:
```json
{
  "success": true,
  "action": "created|updated|linked",
  "intercomContact": { ... }
}
```

### POST /sync/batch

Batch sync multiple contacts

**Request**:
```json
{
  "keap_contact_ids": [12345, 67890, ...]
}
```

**Response**:
```json
{
  "total": 2,
  "succeeded": 2,
  "failed": 0,
  "results": [ ... ]
}
```

### GET /health

Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T12:00:00Z",
  "environment": "production"
}
```

## How It Works

### Automatic Sync (Webhook Flow)

1. **Contact Event** - Contact created/updated in Keap
2. **Webhook Triggered** - Keap sends webhook to worker
3. **Fetch Contact** - Worker retrieves full contact data from Keap
4. **Search Intercom** - Searches for existing contact by email
5. **Update or Create**:
   - If found: Updates contact with `external_id = keap_contact_id`
   - If not found: Creates new contact with `external_id = keap_contact_id`
6. **Log Sync** - Records sync operation in Supabase

### Manual Sync

Use the `/sync/contact` or `/sync/batch` endpoints to manually trigger syncs:

```bash
# Single contact
curl -X POST https://your-worker.workers.dev/sync/contact \
  -H "Content-Type: application/json" \
  -d '{"keap_contact_id": 12345}'

# Batch contacts
curl -X POST https://your-worker.workers.dev/sync/batch \
  -H "Content-Type: application/json" \
  -d '{"keap_contact_ids": [12345, 67890]}'
```

## Intercom External ID

The worker sets Intercom's `external_id` field to the Keap contact ID. This allows you to:

- **Query Intercom by Keap ID**: `GET /contacts?external_id=12345`
- **Reference in Data Connectors**: Use `{{user.external_id}}` in API calls
- **Link Systems**: Easily cross-reference between Keap and Intercom

## Development

```bash
# Local development
npm run dev

# View logs
wrangler tail

# Deploy
npm run deploy
```

## Troubleshooting

**Webhook not receiving events:**
- Verify webhook URL in Keap settings
- Check webhook secret matches `KEAP_WEBHOOK_SECRET`
- Review worker logs with `wrangler tail`

**Contacts not syncing:**
- Ensure contact has valid email address
- Check Supabase logs for error messages
- Verify Intercom API token has write permissions

**Duplicate contacts:**
- Worker searches by email before creating
- If multiple Intercom contacts exist with same email, updates the first match
- Consider running manual cleanup script

## License

MIT
