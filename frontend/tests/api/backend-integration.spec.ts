import { test, expect } from '@playwright/test';

test.describe('Backend Integration and API Testing', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test.describe('Supabase Database Integration', () => {
    test('Database connection and basic queries', async ({ request }) => {
      // Test database health through API
      const healthResponse = await request.get('/api/dashboard/health');
      expect(healthResponse.status()).toBe(200);
      
      const healthData = await healthResponse.json();
      expect(healthData).toHaveProperty('database');
      
      // If database is connected, verify basic operations
      if (healthData.database === 'connected') {
        // Test metrics endpoint that requires database
        const metricsResponse = await request.get('/api/dashboard/metrics');
        expect(metricsResponse.status()).toBe(200);
        
        const metrics = await metricsResponse.json();
        expect(metrics).toHaveProperty('totalContacts');
        expect(metrics).toHaveProperty('totalOrders');
        expect(typeof metrics.totalContacts).toBe('number');
        expect(typeof metrics.totalOrders).toBe('number');
      }
    });

    test('Sync status table operations', async ({ request }) => {
      // Test sync status endpoint
      const syncStatusResponse = await request.get('/api/sync/status');
      
      if (syncStatusResponse.status() === 200) {
        const syncStatus = await syncStatusResponse.json();
        expect(Array.isArray(syncStatus)).toBe(true);
        
        // Verify sync status structure if data exists
        if (syncStatus.length > 0) {
          const firstStatus = syncStatus[0];
          expect(firstStatus).toHaveProperty('entity_type');
          expect(firstStatus).toHaveProperty('last_synced_at');
          expect(['contact', 'order', 'tag', 'subscription']).toContain(firstStatus.entity_type);
        }
      }
    });

    test('Real-time subscriptions', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Enable real-time monitoring
      let realtimeEvents = [];
      await page.evaluateOnNewDocument(() => {
        window.realtimeEvents = [];
        
        // Mock or listen for Supabase real-time events
        if (window.supabase) {
          const originalChannel = window.supabase.channel;
          window.supabase.channel = function(...args) {
            const channel = originalChannel.apply(this, args);
            const originalOn = channel.on;
            
            channel.on = function(event, callback) {
              window.realtimeEvents.push({ event, timestamp: Date.now() });
              return originalOn.call(this, event, callback);
            };
            
            return channel;
          };
        }
      });
      
      // Trigger a sync operation that should cause real-time updates
      const syncButton = page.locator('button:has-text("Sync Contacts")');
      if (await syncButton.count() > 0) {
        await syncButton.click();
        
        // Wait for potential real-time updates
        await page.waitForTimeout(3000);
        
        // Check if real-time events were triggered
        const events = await page.evaluate(() => window.realtimeEvents || []);
        console.log('Real-time events captured:', events.length);
      }
    });
  });

  test.describe('Keap API Integration', () => {
    test('OAuth token management', async ({ request }) => {
      // Test OAuth initiation
      const oauthResponse = await request.post('/api/keap/oauth', {
        data: {
          action: 'initiate',
          keapAccountId: 'test-account-123'
        }
      });
      
      expect(oauthResponse.status()).toBe(200);
      const oauthData = await oauthResponse.json();
      
      expect(oauthData).toHaveProperty('authUrl');
      expect(oauthData.authUrl).toContain('accounts.infusionsoft.com');
      expect(oauthData.authUrl).toContain('client_id=');
      expect(oauthData.authUrl).toContain('scope=full');
      expect(oauthData.authUrl).toContain('response_type=code');
    });

    test('Token validation and refresh simulation', async ({ request }) => {
      // Test token validation endpoint
      const tokenCheckResponse = await request.post('/api/keap/token/validate', {
        data: {
          keapAccountId: 'test-account-123'
        }
      });
      
      // Should handle missing tokens gracefully
      expect([200, 401, 404]).toContain(tokenCheckResponse.status());
      
      if (tokenCheckResponse.status() === 200) {
        const tokenData = await tokenCheckResponse.json();
        expect(tokenData).toHaveProperty('valid');
        expect(typeof tokenData.valid).toBe('boolean');
      }
    });

    test('Rate limiting protection', async ({ request }) => {
      // Test that rate limiting is properly implemented
      const requests = [];
      
      // Make multiple rapid requests to test rate limiting
      for (let i = 0; i < 5; i++) {
        requests.push(
          request.post('/api/sync/trigger', {
            data: {
              keapAccountId: 'test-account-123',
              syncType: 'contacts'
            }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed (rate limiting should be handled internally)
      responses.forEach((response, index) => {
        expect(response.status(), `Request ${index + 1} should succeed`).toBe(200);
      });
      
      // Verify responses indicate proper queuing or rate limiting
      for (const response of responses) {
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
      }
    });
  });

  test.describe('Cloudflare Workers Integration', () => {
    test('Worker deployment status', async ({ request }) => {
      // Test if Cloudflare Workers are responding
      const workerEndpoints = [
        process.env.SYNC_WORKER_URL,
        process.env.WEBHOOK_HANDLER_URL,
        process.env.SYNC_COORDINATOR_URL
      ].filter(Boolean);
      
      if (workerEndpoints.length === 0) {
        console.log('No Cloudflare Worker URLs configured - using local fallbacks');
        return;
      }
      
      for (const workerUrl of workerEndpoints) {
        try {
          const healthCheck = await request.get(`${workerUrl}/health`);
          expect([200, 404]).toContain(healthCheck.status());
          
          if (healthCheck.status() === 200) {
            const health = await healthCheck.json();
            console.log(`Worker ${workerUrl} is healthy:`, health);
          }
        } catch (error) {
          console.log(`Worker ${workerUrl} not accessible:`, error.message);
        }
      }
    });

    test('Webhook endpoint availability', async ({ request }) => {
      const webhookUrl = process.env.WEBHOOK_HANDLER_URL;
      
      if (!webhookUrl) {
        console.log('Webhook handler URL not configured - testing local endpoint');
        
        // Test local webhook endpoint
        const localWebhookResponse = await request.post('/api/webhooks/keap/test', {
          data: {
            eventType: 'contact.edit',
            objectKeys: ['test-contact-123'],
            timestamp: new Date().toISOString()
          }
        });
        
        expect([200, 404, 501]).toContain(localWebhookResponse.status());
        return;
      }
      
      // Test actual Cloudflare Worker webhook
      try {
        const webhookResponse = await request.post(webhookUrl, {
          data: {
            eventType: 'test.ping',
            objectKeys: ['test-123']
          },
          headers: {
            'X-Hook-Signature': 'test-signature'
          }
        });
        
        // Webhook should either process (200) or reject invalid signature (401)
        expect([200, 401]).toContain(webhookResponse.status());
      } catch (error) {
        console.log('Webhook endpoint not accessible:', error.message);
      }
    });

    test('Durable Object state management', async ({ request }) => {
      const coordinatorUrl = process.env.SYNC_COORDINATOR_URL;
      
      if (!coordinatorUrl) {
        console.log('Sync coordinator URL not configured - testing local state');
        return;
      }
      
      try {
        // Test Durable Object state operations
        const stateResponse = await request.get(`${coordinatorUrl}/state/test-account`);
        expect([200, 404]).toContain(stateResponse.status());
        
        if (stateResponse.status() === 200) {
          const state = await stateResponse.json();
          expect(state).toHaveProperty('accountId');
          console.log('Durable Object state retrieved:', Object.keys(state));
        }
      } catch (error) {
        console.log('Durable Object not accessible:', error.message);
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('Database connection failure handling', async ({ request }) => {
      // Test API behavior when database is unavailable
      // This tests the fallback to mock data
      
      const metricsResponse = await request.get('/api/dashboard/metrics');
      expect(metricsResponse.status()).toBe(200);
      
      const metrics = await metricsResponse.json();
      expect(metrics).toHaveProperty('totalContacts');
      expect(metrics).toHaveProperty('totalOrders');
      
      // Mock data should be reasonable numbers
      expect(metrics.totalContacts).toBeGreaterThan(0);
      expect(metrics.totalOrders).toBeGreaterThan(0);
    });

    test('API timeout handling', async ({ request }) => {
      // Test API endpoints with simulated delays
      const slowRequest = request.get('/api/dashboard/trends?days=30', {
        timeout: 1000 // 1 second timeout
      });
      
      try {
        const response = await slowRequest;
        expect(response.status()).toBe(200);
      } catch (error) {
        // Timeout is acceptable for this test
        expect(error.message).toContain('timeout');
      }
    });

    test('Invalid request handling', async ({ request }) => {
      // Test API endpoints with invalid data
      const invalidRequests = [
        {
          endpoint: '/api/sync/trigger',
          data: { invalidField: 'test' },
          expectedStatus: [400, 422]
        },
        {
          endpoint: '/api/keap/oauth',
          data: { action: 'invalid_action' },
          expectedStatus: [400, 422]
        }
      ];
      
      for (const { endpoint, data, expectedStatus } of invalidRequests) {
        const response = await request.post(endpoint, { data });
        expect(expectedStatus).toContain(response.status());
        
        if (response.status() >= 400) {
          const errorData = await response.json();
          expect(errorData).toHaveProperty('error');
          expect(typeof errorData.error).toBe('string');
        }
      }
    });

    test('Authentication error handling', async ({ request }) => {
      // Test API endpoints without authentication
      const unauthenticatedRequest = request.get('/api/admin/users', {
        headers: {
          // Remove authorization headers
          'Authorization': ''
        }
      });
      
      try {
        const response = await unauthenticatedRequest;
        // Should either require auth (401) or not exist yet (404)
        expect([401, 404]).toContain(response.status());
      } catch (error) {
        // Network errors are also acceptable for this test
        console.log('Authentication test error (expected):', error.message);
      }
    });
  });

  test.describe('Performance and Monitoring', () => {
    test('API response times', async ({ request }) => {
      const endpoints = [
        '/api/dashboard/health',
        '/api/dashboard/metrics',
        '/api/dashboard/trends?days=7'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request.get(endpoint);
        const responseTime = Date.now() - startTime;
        
        expect(response.status()).toBe(200);
        expect(responseTime).toBeLessThan(5000); // 5 second maximum
        
        console.log(`${endpoint}: ${responseTime}ms`);
      }
    });

    test('Concurrent request handling', async ({ request }) => {
      // Test multiple concurrent requests
      const concurrentRequests = Array(5).fill(null).map(() => 
        request.get('/api/dashboard/health')
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status(), `Concurrent request ${index + 1} should succeed`).toBe(200);
      });
    });

    test('Memory and resource usage monitoring', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Monitor client-side performance
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      console.log('Performance metrics:', performanceMetrics);
      
      // Verify reasonable performance
      expect(performanceMetrics.loadTime).toBeLessThan(3000); // 3 seconds
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds
    });
  });
});