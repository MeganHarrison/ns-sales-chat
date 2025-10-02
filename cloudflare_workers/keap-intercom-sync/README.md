# Intercom-Keap Contact Sync Worker

**PRIMARY SYNC DIRECTION: Intercom → Keap**

Automatically syncs users/contacts created in Intercom to Keap, linking them with Intercom's `external_id` field set to the Keap contact ID.

## Features

- ✅ **Automatic Webhook Sync** - Listens for Intercom user/contact events and syncs to Keap (PRIMARY)
- ✅ **Smart Matching** - Finds existing Keap contacts by email before creating duplicates
- ✅ **External ID Linking** - Sets Intercom `external_id` to Keap contact ID for easy reference
- ✅ **Legacy Keap Sync** - Optional manual sync from Keap → Intercom (for existing contacts)
- ✅ **Sync Logging** - Tracks all sync operations in Supabase
- ✅ **Error Handling** - Comprehensive error handling and retry logic

## Why Intercom → Keap?

This sync direction prevents unnecessary charges from Intercom, which bills based on user count. By only syncing users that are created in Intercom (not all Keap contacts), you maintain control over which contacts appear in Intercom.

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
# INTERCOM_CLIENT_SECRET (optional - for webhook signature verification)
# KEAP_API_KEY
# SUPABASE_URL
# SUPABASE_SERVICE_KEY
```

Set secrets:

```bash
wrangler secret put INTERCOM_ACCESS_TOKEN
wrangler secret put INTERCOM_CLIENT_SECRET  # Optional but recommended
wrangler secret put KEAP_API_KEY
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

### 5. Configure Intercom Webhook

**PRIMARY SETUP**: Configure Intercom to send webhooks when users/contacts are created.

Run the setup script:

```bash
# Set your Intercom access token
export INTERCOM_ACCESS_TOKEN="your_intercom_access_token"

# Set your deployed worker URL
export WORKER_URL="https://your-worker.workers.dev"

# Run setup script
node setup-intercom-webhook.js
```

This will:
- Create webhook subscriptions for `user.created` and `contact.created` events
- List all configured webhooks
- Provide verification instructions

**Manual Intercom Setup** (alternative):

You can also set up webhooks via the Intercom dashboard:
1. Go to Settings → Developers → Webhooks
2. Click "New webhook"
3. Set URL to: `https://your-worker.workers.dev/webhook/intercom`
4. Subscribe to topics: `user.created`, `contact.created`
5. Save the webhook

### 6. (Optional) Configure Keap Webhook for Legacy Sync

**Only needed if you want to sync existing Keap contacts → Intercom**

```bash
# Set environment variables
export KEAP_API_KEY="your_keap_access_token"
export WORKER_URL="https://your-worker.workers.dev"

# Run Keap setup script
node setup-webhook.js
```

## API Endpoints

### POST /webhook/intercom (PRIMARY)

Intercom webhook endpoint - automatically syncs Intercom → Keap

**Request**: Sent by Intercom automatically when user/contact is created
**Response**:
```json
{
  "message": "Webhook received and processing",
  "event_id": "..."
}
```

**What it does**:
1. Receives user/contact data from Intercom
2. Searches for matching contact in Keap by email
3. Creates or updates contact in Keap
4. Links Intercom contact with Keap ID via `external_id`

### POST /webhook/keap (LEGACY)

Keap webhook endpoint - manual Keap → Intercom sync

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

### POST /sync/contact (LEGACY)

Manual single contact sync from Keap → Intercom

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

### POST /sync/batch (LEGACY)

Batch sync multiple contacts from Keap → Intercom

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

### PRIMARY: Automatic Sync (Intercom → Keap)

1. **User Created in Intercom** - New user/contact created in Intercom
2. **Webhook Triggered** - Intercom sends webhook to worker `/webhook/intercom`
3. **Receive Contact Data** - Worker receives user email, name, phone from webhook
4. **Search Keap** - Searches for existing contact in Keap by email
5. **Create or Update in Keap**:
   - If found: Updates existing Keap contact
   - If not found: Creates new contact in Keap
6. **Link via External ID** - Sets Intercom contact's `external_id` to Keap contact ID
7. **Log Sync** - Records sync operation in Supabase

### LEGACY: Manual Sync (Keap → Intercom)

Use the `/sync/contact` or `/sync/batch` endpoints to manually sync existing Keap contacts:

```bash
# Single contact (Keap → Intercom)
curl -X POST https://your-worker.workers.dev/sync/contact \
  -H "Content-Type: application/json" \
  -d '{"keap_contact_id": 12345}'

# Batch contacts (Keap → Intercom)
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
- Verify webhook URL in Intercom dashboard: Settings → Developers → Webhooks
- Check webhook signature verification with `INTERCOM_CLIENT_SECRET`
- Review worker logs with `wrangler tail`
- Test webhook manually using Intercom's webhook tester

**Contacts not syncing:**
- Ensure contact has valid email address (required)
- Check Supabase sync logs for error messages
- Verify Keap API token has write permissions for contacts
- Ensure Intercom API token has permission to update contacts

**Duplicate contacts:**
- Worker searches Keap by email before creating
- If multiple Keap contacts exist with same email, updates the first match
- Consider running manual cleanup in Keap first

**External ID not updating:**
- Ensure Intercom API token has `contacts:write` permission
- Check worker logs for `linkKeapContact` errors
- Verify the contact role is set to 'user' (required for external_id)

## License

MIT
