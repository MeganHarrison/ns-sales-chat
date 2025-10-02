# Testing the Intercom → Keap Sync

## How to Verify the Sync is Working

### Method 1: Automated Test Script

Use the provided test script to verify end-to-end functionality:

```bash
# Set required environment variables
export WORKER_URL="https://your-worker.workers.dev"
export INTERCOM_ACCESS_TOKEN="your_intercom_token"

# Run the test
node test-sync.js
```

**What the test does:**
1. Sends a mock Intercom webhook to your worker
2. Waits for the sync to complete
3. Queries Intercom to verify the `external_id` was set
4. Reports success or failure

**Expected output:**
```
✅ SUCCESS: external_id is set to Keap contact ID: 12345
🎉 Test passed! The sync is working correctly.
```

### Method 2: Manual Testing with Real Intercom User

1. **Create a test user in Intercom:**
   - Go to Intercom dashboard
   - Create a new contact with a test email (e.g., `test@example.com`)

2. **Check Worker Logs:**
   ```bash
   cd cloudflare_workers/keap-intercom-sync
   wrangler tail
   ```

   Look for these log messages:
   ```
   Intercom webhook received: { topic: 'contact.created', ... }
   Processing Intercom contact test-contact-123
   Searching for contact with email test@example.com in Keap
   Creating new Keap contact for test@example.com
   Linking Intercom contact test-contact-123 with Keap contact 456
   ✅ Successfully linked! Intercom external_id is now: 456
   ```

3. **Verify in Intercom:**

   Query the Intercom API to check the `external_id`:
   ```bash
   curl -X POST https://api.intercom.io/contacts/search \
     -H "Authorization: Bearer YOUR_INTERCOM_TOKEN" \
     -H "Content-Type: application/json" \
     -H "Intercom-Version: 2.11" \
     -d '{
       "query": {
         "field": "email",
         "operator": "=",
         "value": "test@example.com"
       }
     }' | jq '.data[0].external_id'
   ```

   **Expected result:** The Keap contact ID (e.g., `"456"`)

4. **Verify in Keap:**

   Check that the contact exists in Keap:
   ```bash
   curl https://api.infusionsoft.com/crm/rest/v1/contacts/456 \
     -H "Authorization: Bearer YOUR_KEAP_TOKEN"
   ```

### Method 3: Check Supabase Sync Logs

Query the sync logs table:

```sql
SELECT
  keap_contact_id,
  intercom_contact_id,
  sync_status,
  sync_direction,
  synced_at,
  error_message
FROM keap_intercom_sync_logs
WHERE sync_direction = 'intercom_to_keap'
ORDER BY synced_at DESC
LIMIT 10;
```

**Expected result:**
```
keap_contact_id | intercom_contact_id  | sync_status | sync_direction
456             | test-contact-123     | synced      | intercom_to_keap
```

## Verifying External ID is Set

The most important check is confirming the `external_id` in Intercom:

### Using Intercom API

```bash
# Get contact by email
curl -X POST https://api.intercom.io/contacts/search \
  -H "Authorization: Bearer YOUR_INTERCOM_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: 2.11" \
  -d '{
    "query": {
      "field": "email",
      "operator": "=",
      "value": "user@example.com"
    }
  }'
```

Look for this in the response:
```json
{
  "data": [
    {
      "id": "contact-abc123",
      "email": "user@example.com",
      "external_id": "456",  // ← This should be the Keap contact ID
      ...
    }
  ]
}
```

### Using Intercom Dashboard

1. Go to Intercom → Contacts
2. Search for the test contact
3. View the contact details
4. The external ID should be visible in the contact's attributes

## Troubleshooting

### External ID is NULL

**Problem:** The `external_id` field is not being set in Intercom.

**Possible causes:**
1. Intercom API token doesn't have `contacts:write` permission
2. The contact role is not set to 'user' (required for external_id)
3. The `linkKeapContact()` call is failing silently

**How to debug:**
```bash
# Check worker logs for errors
wrangler tail

# Look for this specific log message:
# "✅ Successfully linked! Intercom external_id is now: XXX"
```

### Sync Status is 'failed' in Supabase

**Problem:** Sync is failing but you don't know why.

**Solution:**
Check the `error_message` column:
```sql
SELECT error_message, synced_at
FROM keap_intercom_sync_logs
WHERE sync_status = 'failed'
ORDER BY synced_at DESC;
```

### No Webhook Events Received

**Problem:** Worker isn't receiving Intercom webhooks.

**Solution:**
1. Verify webhook is configured in Intercom dashboard
2. Check webhook URL is correct: `https://your-worker.workers.dev/webhook/intercom`
3. Test manually with curl:
   ```bash
   curl -X POST https://your-worker.workers.dev/webhook/intercom \
     -H "Content-Type: application/json" \
     -d '{"type":"notification_event","topic":"contact.created",...}'
   ```

## Success Criteria

The sync is working correctly when:

- ✅ Worker receives Intercom webhooks (`200 OK` response)
- ✅ Contacts are created/updated in Keap
- ✅ Intercom contact's `external_id` is set to the Keap contact ID
- ✅ Supabase logs show `sync_status = 'synced'` and `sync_direction = 'intercom_to_keap'`
- ✅ Worker logs show: `✅ Successfully linked! Intercom external_id is now: XXX`
