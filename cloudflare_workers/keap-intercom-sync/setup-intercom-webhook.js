/**
 * Setup Intercom Webhook
 * Creates a webhook subscription in Intercom to listen for user/contact events
 *
 * Usage:
 *   node setup-intercom-webhook.js
 *
 * Required environment variables:
 *   INTERCOM_ACCESS_TOKEN - Your Intercom access token
 *   WORKER_URL - Your deployed Cloudflare Worker URL (e.g., https://your-worker.workers.dev)
 */

const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
const WORKER_URL = process.env.WORKER_URL;

if (!INTERCOM_ACCESS_TOKEN) {
  console.error('❌ Error: INTERCOM_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

if (!WORKER_URL) {
  console.error('❌ Error: WORKER_URL environment variable is required');
  console.error('   Example: export WORKER_URL=https://your-worker.workers.dev');
  process.exit(1);
}

const webhookUrl = `${WORKER_URL}/webhook/intercom`;

/**
 * Create Intercom webhook subscription
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Subscriptions/subscription
 */
async function createIntercomWebhook(topic) {
  const url = 'https://api.intercom.io/subscriptions';

  const payload = {
    service_type: 'web',
    topics: [topic],
    url: webhookUrl,
    metadata: {
      source: 'keap-sync-worker',
      created_by: 'setup-script',
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Failed to create webhook for ${topic}: ${error.message}`);
  }
}

/**
 * List existing webhooks
 */
async function listIntercomWebhooks() {
  const url = 'https://api.intercom.io/subscriptions';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Failed to list webhooks: ${error.message}`);
  }
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Setting up Intercom Webhooks\n');
  console.log(`Webhook URL: ${webhookUrl}\n`);

  // List existing webhooks first
  console.log('📋 Checking existing webhooks...');
  try {
    const existing = await listIntercomWebhooks();
    console.log(`Found ${existing.data?.length || 0} existing webhook(s)\n`);

    if (existing.data && existing.data.length > 0) {
      console.log('Existing webhooks:');
      existing.data.forEach((webhook, index) => {
        console.log(`  ${index + 1}. Topics: ${webhook.topics.join(', ')}`);
        console.log(`     URL: ${webhook.url}`);
        console.log(`     ID: ${webhook.id}\n`);
      });
    }
  } catch (error) {
    console.error('⚠️  Warning: Could not list existing webhooks:', error.message);
  }

  // Topics to subscribe to
  const topics = [
    'user.created',
    'contact.created',
  ];

  console.log('Creating webhook subscriptions...\n');

  const results = [];

  for (const topic of topics) {
    try {
      console.log(`Creating webhook for: ${topic}`);
      const result = await createIntercomWebhook(topic);
      results.push({ topic, success: true, data: result });
      console.log(`✅ Successfully created webhook for ${topic}`);
      console.log(`   Subscription ID: ${result.id}\n`);
    } catch (error) {
      results.push({ topic, success: false, error: error.message });
      console.error(`❌ Failed to create webhook for ${topic}`);
      console.error(`   Error: ${error.message}\n`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${topics.length}`);
  console.log(`❌ Failed: ${failed.length}/${topics.length}\n`);

  if (successful.length > 0) {
    console.log('✅ Webhook setup complete!');
    console.log('\nNext steps:');
    console.log('1. Test the webhook by creating a user/contact in Intercom');
    console.log('2. Check your Cloudflare Worker logs for incoming webhook events');
    console.log('3. Verify that contacts are being synced to Keap\n');
  }

  if (failed.length > 0) {
    console.log('⚠️  Some webhooks failed to create. Please check the errors above.');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
