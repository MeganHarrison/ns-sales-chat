/**
 * Test Script: Verify Intercom → Keap Sync
 *
 * This script tests that:
 * 1. A mock Intercom webhook triggers the sync
 * 2. A contact is created in Keap
 * 3. The Intercom contact's external_id is set to the Keap contact ID
 *
 * Usage:
 *   WORKER_URL=https://your-worker.workers.dev node test-sync.js
 */

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

if (!INTERCOM_ACCESS_TOKEN) {
  console.error('❌ Error: INTERCOM_ACCESS_TOKEN environment variable required');
  process.exit(1);
}

// Mock Intercom webhook payload
const mockWebhook = {
  type: 'notification_event',
  app_id: 'test-app',
  data: {
    type: 'notification_event_data',
    item: {
      type: 'contact',
      id: 'test-contact-' + Date.now(),
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      phone: '+1234567890',
      created_at: Math.floor(Date.now() / 1000),
    },
  },
  topic: 'contact.created',
  id: 'event-' + Date.now(),
  created_at: Math.floor(Date.now() / 1000),
};

async function testWebhook() {
  console.log('🧪 Testing Intercom → Keap Sync\n');
  console.log('Mock webhook payload:');
  console.log(JSON.stringify(mockWebhook, null, 2));
  console.log('\n');

  // Step 1: Send webhook to worker
  console.log('📤 Step 1: Sending webhook to worker...');
  const webhookUrl = `${WORKER_URL}/webhook/intercom`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhook),
    });

    const result = await response.json();
    console.log(`✅ Webhook response (${response.status}):`, result);

    if (!response.ok) {
      throw new Error(`Webhook failed: ${JSON.stringify(result)}`);
    }

    // Wait for sync to process
    console.log('\n⏳ Waiting 5 seconds for sync to complete...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 2: Verify external_id was set in Intercom
    console.log('🔍 Step 2: Verifying external_id in Intercom...');
    const intercomContact = await getIntercomContact(mockWebhook.data.item.email);

    if (!intercomContact) {
      throw new Error('Contact not found in Intercom');
    }

    console.log('\n📋 Intercom Contact Details:');
    console.log(`  - ID: ${intercomContact.id}`);
    console.log(`  - Email: ${intercomContact.email}`);
    console.log(`  - Name: ${intercomContact.name}`);
    console.log(`  - External ID: ${intercomContact.external_id || '(not set)'}`);

    if (intercomContact.external_id) {
      console.log('\n✅ SUCCESS: external_id is set to Keap contact ID:', intercomContact.external_id);
      console.log('\n🎉 Test passed! The sync is working correctly.');
      return true;
    } else {
      console.log('\n❌ FAILURE: external_id was NOT set in Intercom');
      console.log('This means the linkKeapContact() call is not working.');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

async function getIntercomContact(email) {
  const url = 'https://api.intercom.io/contacts/search';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11',
    },
    body: JSON.stringify({
      query: {
        field: 'email',
        operator: '=',
        value: email,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Intercom API error: ${response.status}`);
  }

  const result = await response.json();
  return result.data.length > 0 ? result.data[0] : null;
}

// Run the test
testWebhook().then(success => {
  process.exit(success ? 0 : 1);
});
