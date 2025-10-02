#!/usr/bin/env node

/**
 * Basic API Test Script
 * Tests the API endpoints to verify the fixes work
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
            headers: res.headers
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test the critical API endpoints
async function testApiEndpoints() {
  console.log('🚀 Testing Critical API Endpoints...\n');

  const tests = [
    {
      name: 'Dashboard Metrics',
      path: '/api/dashboard/metrics',
      expectedStatus: [200, 500]
    },
    {
      name: 'Dashboard Trends',
      path: '/api/dashboard/trends?days=7',
      expectedStatus: [200, 500]
    },
    {
      name: 'Sync Trigger (missing data)',
      path: '/api/sync/trigger',
      method: 'POST',
      data: {},
      expectedStatus: [400]
    },
    {
      name: 'Keap Test (missing token)',
      path: '/api/keap/test-connection',
      method: 'POST',
      data: {},
      expectedStatus: [400]
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📝 Testing: ${test.name}`);
      const result = await makeRequest(test.path, test.method, test.data);
      
      if (test.expectedStatus.includes(result.status)) {
        console.log(`✅ PASS - Status: ${result.status}`);
        passed++;
      } else {
        console.log(`❌ FAIL - Expected: ${test.expectedStatus}, Got: ${result.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAIL - Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/');
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server not running - start with: cd frontend_nextjs && npm run dev\n');
    return false;
  }
}

async function main() {
  console.log('🔧 Testing API Layer Fixes\n');
  
  if (await checkServer()) {
    const success = await testApiEndpoints();
    process.exit(success ? 0 : 1);
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}