/**
 * Script to create Keap REST Hook subscription
 * Run this after deploying the worker to set up webhook
 */

const KEAP_API_KEY = process.env.KEAP_API_KEY;
const WORKER_URL = process.env.WORKER_URL || 'https://your-worker.workers.dev';

async function createKeapWebhook(eventKey, hookUrl) {
  const response = await fetch('https://api.infusionsoft.com/crm/rest/v1/hooks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEAP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventKey,
      hookUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create webhook: ${response.status} - ${error}`);
  }

  return response.json();
}

async function listWebhooks() {
  const response = await fetch('https://api.infusionsoft.com/crm/rest/v1/hooks', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KEAP_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list webhooks: ${response.status}`);
  }

  return response.json();
}

async function verifyWebhook(hookKey) {
  const response = await fetch(
    `https://api.infusionsoft.com/crm/rest/v1/hooks/${hookKey}/verify`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEAP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to verify webhook: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('🔧 Setting up Keap webhooks...\n');

    if (!KEAP_API_KEY) {
      console.error('❌ KEAP_API_KEY environment variable not set');
      process.exit(1);
    }

    const webhookUrl = `${WORKER_URL}/webhook/keap`;
    console.log(`📍 Webhook URL: ${webhookUrl}\n`);

    // Events to subscribe to
    const events = [
      'contact.add',
      'contact.edit',
    ];

    console.log('📝 Creating webhook subscriptions...\n');

    for (const eventKey of events) {
      try {
        console.log(`  Creating hook for: ${eventKey}`);
        const result = await createKeapWebhook(eventKey, webhookUrl);
        console.log(`  ✅ Created hook: ${result.key} (status: ${result.status})`);

        // Attempt verification
        if (result.status !== 'Verified') {
          console.log(`  🔄 Attempting to verify hook ${result.key}...`);
          try {
            await verifyWebhook(result.key);
            console.log(`  ✅ Hook verified successfully`);
          } catch (verifyError) {
            console.log(`  ⚠️  Verification will happen automatically when webhook receives first request`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error creating hook for ${eventKey}:`, error.message);
      }
      console.log('');
    }

    // List all webhooks
    console.log('📋 Current webhook subscriptions:\n');
    const hooks = await listWebhooks();

    if (hooks && hooks.length > 0) {
      hooks.forEach((hook) => {
        console.log(`  ${hook.key}:`);
        console.log(`    Event: ${hook.eventKey}`);
        console.log(`    URL: ${hook.hookUrl}`);
        console.log(`    Status: ${hook.status}`);
        console.log('');
      });
    } else {
      console.log('  No webhooks found');
    }

    console.log('✅ Webhook setup complete!\n');
    console.log('📝 Next steps:');
    console.log('  1. Test the webhook by creating/updating a contact in Keap');
    console.log('  2. Check worker logs: wrangler tail');
    console.log('  3. Verify sync in Supabase keap_intercom_sync_logs table');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
