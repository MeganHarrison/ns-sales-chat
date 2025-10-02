import { test, expect } from '@playwright/test';
import { API_ENDPOINTS } from '../auth.config';

test.describe('Complete Keap-Supabase Sync Flow', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('OAuth setup and authentication flow', async ({ page, context }) => {
    // Test OAuth setup button
    const oauthButton = page.locator('button:has-text("Setup OAuth")');
    await expect(oauthButton).toBeVisible();
    
    // Click OAuth setup
    await oauthButton.click();
    
    // Monitor network requests for OAuth calls
    const oauthRequest = page.waitForRequest(request => 
      request.url().includes('/api/keap/oauth')
    );
    
    const oauthResponse = page.waitForResponse(response => 
      response.url().includes('/api/keap/oauth') && response.status() === 200
    );
    
    await Promise.all([oauthRequest, oauthResponse]);
    
    // Verify OAuth response contains auth URL
    const response = await (await oauthResponse).json();
    expect(response).toHaveProperty('authUrl');
    expect(response.authUrl).toContain('accounts.infusionsoft.com');
    
    // Take screenshot of OAuth setup
    await page.screenshot({ path: 'test-results/oauth-setup.png', fullPage: true });
  });

  test('Manual sync operations', async ({ page }) => {
    // Test all sync buttons
    const syncButtons = [
      { button: 'Sync All', expectedMessage: 'all sync triggered successfully' },
      { button: 'Sync Contacts', expectedMessage: 'contacts sync triggered successfully' },
    ];

    for (const { button, expectedMessage } of syncButtons) {
      // Click sync button
      const syncButton = page.locator(`button:has-text("${button}")`);
      await expect(syncButton).toBeVisible();
      await syncButton.click();

      // Wait for API request
      const syncRequest = page.waitForRequest(request => 
        request.url().includes('/api/sync/trigger')
      );
      
      const syncResponse = page.waitForResponse(response => 
        response.url().includes('/api/sync/trigger') && response.status() === 200
      );

      await Promise.all([syncRequest, syncResponse]);

      // Verify success message appears
      const successMessage = page.locator('.success, [data-testid="success-message"]');
      await expect(successMessage).toContainText(expectedMessage, { timeout: 5000 });
      
      // Wait for any UI updates
      await page.waitForTimeout(1000);
    }

    // Take screenshot of completed sync operations
    await page.screenshot({ path: 'test-results/sync-operations.png', fullPage: true });
  });

  test('Dashboard data loading and real-time updates', async ({ page }) => {
    // Verify KPI cards load with data
    const totalContacts = page.locator('[data-testid="total-contacts"], .metric-card:has-text("Total Contacts")');
    const totalOrders = page.locator('[data-testid="total-orders"], .metric-card:has-text("Total Orders")');
    const totalRevenue = page.locator('[data-testid="total-revenue"], .metric-card:has-text("Total Revenue")');
    const syncHealth = page.locator('[data-testid="sync-health"], .metric-card:has-text("Sync Health")');

    await expect(totalContacts).toBeVisible();
    await expect(totalOrders).toBeVisible();
    await expect(totalRevenue).toBeVisible();
    await expect(syncHealth).toBeVisible();

    // Verify numbers are displayed (not just loading states)
    await expect(totalContacts.locator('.metric-value, .card-value')).not.toBeEmpty();
    await expect(totalOrders.locator('.metric-value, .card-value')).not.toBeEmpty();
    
    // Verify charts load
    const performanceChart = page.locator('[data-testid="performance-chart"], .recharts-wrapper').first();
    const healthChart = page.locator('[data-testid="health-chart"], .recharts-wrapper').last();
    
    await expect(performanceChart).toBeVisible();
    await expect(healthChart).toBeVisible();

    // Take screenshot of loaded dashboard
    await page.screenshot({ path: 'test-results/dashboard-loaded.png', fullPage: true });
  });

  test('Recent sync activities display', async ({ page }) => {
    // Verify recent activities section
    const activitiesSection = page.locator('[data-testid="recent-activities"], h3:has-text("Recent Sync Activities")').locator('..');
    await expect(activitiesSection).toBeVisible();

    // Check for activity items
    const activityItems = activitiesSection.locator('.activity-item, [data-testid*="activity"], .space-y-4 > div');
    const activityCount = await activityItems.count();
    
    if (activityCount > 0) {
      // Verify activity items have required elements
      for (let i = 0; i < Math.min(activityCount, 3); i++) {
        const item = activityItems.nth(i);
        await expect(item).toContainText(/Sync|sync/, { timeout: 5000 });
        await expect(item).toContainText(/ago|minutes|hours/, { timeout: 5000 });
      }
    } else {
      // Verify "no activities" message
      await expect(activitiesSection).toContainText('No recent sync activities', { timeout: 5000 });
    }

    // Take screenshot of activities
    await page.screenshot({ path: 'test-results/sync-activities.png', fullPage: true });
  });

  test('Tab navigation and content', async ({ page }) => {
    const tabs = ['Overview', 'Contacts', 'Orders', 'Sync Health'];
    
    for (const tabName of tabs) {
      // Click tab
      const tab = page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
      await expect(tab).toBeVisible();
      await tab.click();
      
      // Wait for tab content to load
      await page.waitForTimeout(500);
      
      // Verify tab content is visible
      const tabContent = page.locator(`[role="tabpanel"], [data-tab="${tabName.toLowerCase()}"]`);
      await expect(tabContent).toBeVisible();
      
      // Take screenshot of each tab
      await page.screenshot({ 
        path: `test-results/tab-${tabName.toLowerCase()}.png`, 
        fullPage: true 
      });
    }
  });

  test('Conflict alerts and resolution', async ({ page }) => {
    // Check for conflict alerts
    const conflictAlert = page.locator('[data-testid="conflict-alert"], .alert:has-text("conflict"), .warning:has-text("conflict")');
    
    if (await conflictAlert.count() > 0) {
      await expect(conflictAlert).toBeVisible();
      
      // Check for resolve conflicts link/button
      const resolveButton = page.locator('button:has-text("Resolve"), a:has-text("Resolve conflicts")');
      if (await resolveButton.count() > 0) {
        await expect(resolveButton).toBeVisible();
        // Note: Don't click in test to avoid changing state
      }
      
      // Take screenshot of conflict alert
      await page.screenshot({ path: 'test-results/conflict-alert.png', fullPage: true });
    } else {
      console.log('No conflicts present - this is expected for a healthy system');
    }
  });
});

test.describe('API Endpoint Testing', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test('Dashboard API endpoints respond correctly', async ({ request }) => {
    // Test all dashboard API endpoints
    const endpoints = [
      { url: API_ENDPOINTS.dashboardHealth, name: 'Health' },
      { url: API_ENDPOINTS.dashboardTrends + '?days=7', name: 'Trends' },
    ];

    for (const { url, name } of endpoints) {
      const response = await request.get(url);
      expect(response.status(), `${name} endpoint should return 200`).toBe(200);
      
      const data = await response.json();
      expect(data, `${name} endpoint should return valid JSON`).toBeDefined();
      
      console.log(`✓ ${name} API endpoint working:`, Object.keys(data));
    }
  });

  test('Sync API endpoints function correctly', async ({ request }) => {
    // Test sync trigger endpoint
    const syncResponse = await request.post(API_ENDPOINTS.syncTrigger, {
      data: {
        keapAccountId: 'test-account',
        syncType: 'contacts'
      }
    });
    
    expect(syncResponse.status()).toBe(200);
    const syncData = await syncResponse.json();
    expect(syncData).toHaveProperty('success', true);
    expect(syncData).toHaveProperty('message');
    expect(syncData.message).toContain('sync triggered successfully');
  });

  test('OAuth API endpoint returns valid response', async ({ request }) => {
    const oauthResponse = await request.post(API_ENDPOINTS.keapOAuth, {
      data: {
        action: 'initiate',
        keapAccountId: 'test-account'
      }
    });
    
    expect(oauthResponse.status()).toBe(200);
    const oauthData = await oauthResponse.json();
    expect(oauthData).toHaveProperty('authUrl');
    expect(oauthData.authUrl).toContain('accounts.infusionsoft.com');
  });
});