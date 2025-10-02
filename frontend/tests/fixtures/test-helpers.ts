import { test as base, expect, Page } from '@playwright/test';
import { API_ENDPOINTS } from '../auth.config';

// Extend Playwright test with custom fixtures and helpers
export const test = base.extend<{
  authenticatedPage: Page;
  dashboardPage: Page;
  adminPage: Page;
}>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Verify authentication state
    const isAuthenticated = await page.locator('[data-testid="user-menu"], .user-avatar, body:not(:has-text("Login"))').count() > 0;
    if (!isAuthenticated) {
      throw new Error('Page is not authenticated. Check auth setup.');
    }
    
    await use(page);
  },

  // Dashboard-specific page fixture
  dashboardPage: async ({ authenticatedPage }, use) => {
    // Ensure we're on the dashboard
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Wait for dashboard content to load
    await expect(authenticatedPage.locator('h1:has-text("Dashboard"), h1:has-text("Keap")')).toBeVisible();
    
    await use(authenticatedPage);
  },

  // Admin page fixture (if admin routes exist)
  adminPage: async ({ page }, use) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

// Custom helper functions
export class DashboardHelpers {
  constructor(private page: Page) {}

  async waitForMetricsToLoad() {
    // Wait for all metric cards to load with actual data
    const metricSelectors = [
      '[data-testid="total-contacts"]',
      '[data-testid="total-orders"]', 
      '[data-testid="total-revenue"]',
      '[data-testid="sync-health"]'
    ];

    for (const selector of metricSelectors) {
      const element = this.page.locator(selector);
      if (await element.count() > 0) {
        await expect(element.locator('.metric-value, .card-value')).not.toBeEmpty();
      }
    }
  }

  async triggerSync(syncType: 'all' | 'contacts' | 'orders' = 'all') {
    const syncButton = this.page.locator(`button:has-text("Sync ${syncType === 'all' ? 'All' : syncType}")`);
    await expect(syncButton).toBeVisible();
    
    // Click and wait for response
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/api/sync/trigger') && response.status() === 200
    );
    
    await syncButton.click();
    await responsePromise;
    
    // Wait for success message
    const successMessage = this.page.locator('.success, [data-testid="success-message"]');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  }

  async switchTab(tabName: string) {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
    await expect(tab).toBeVisible();
    await tab.click();
    
    // Wait for tab content to load
    await this.page.waitForTimeout(500);
    
    const tabContent = this.page.locator(`[role="tabpanel"], [data-tab="${tabName.toLowerCase()}"]`);
    await expect(tabContent).toBeVisible();
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/${name}.png`, 
      fullPage: true 
    });
  }

  async verifyChartsLoaded() {
    const charts = this.page.locator('.recharts-wrapper, [data-testid*="chart"]');
    const chartCount = await charts.count();
    
    if (chartCount > 0) {
      for (let i = 0; i < chartCount; i++) {
        await expect(charts.nth(i)).toBeVisible();
      }
    }
  }
}

export class APIHelpers {
  constructor(private request: any) {}

  async testEndpoint(endpoint: string, expectedStatus: number = 200) {
    const response = await this.request.get(endpoint);
    expect(response.status(), `${endpoint} should return ${expectedStatus}`).toBe(expectedStatus);
    
    if (expectedStatus === 200) {
      const data = await response.json();
      expect(data, `${endpoint} should return valid JSON`).toBeDefined();
      return data;
    }
    
    return null;
  }

  async testSyncTrigger(syncType: string = 'contacts', keapAccountId: string = 'test-account') {
    const response = await this.request.post(API_ENDPOINTS.syncTrigger, {
      data: { keapAccountId, syncType }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('message');
    
    return data;
  }

  async testOAuthEndpoint(action: string = 'initiate', keapAccountId: string = 'test-account') {
    const response = await this.request.post(API_ENDPOINTS.keapOAuth, {
      data: { action, keapAccountId }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    if (action === 'initiate') {
      expect(data).toHaveProperty('authUrl');
      expect(data.authUrl).toContain('accounts.infusionsoft.com');
    }
    
    return data;
  }
}

export class MobileHelpers {
  constructor(private page: Page) {}

  async testTouchTarget(selector: string, minSize: number = 44) {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    
    const box = await element.boundingBox();
    if (box) {
      expect(box.height, `${selector} should have minimum touch height`).toBeGreaterThanOrEqual(minSize);
      expect(box.width, `${selector} should have minimum touch width`).toBeGreaterThanOrEqual(minSize);
    }
  }

  async testSwipeGesture(element: string, direction: 'left' | 'right' | 'up' | 'down') {
    const target = this.page.locator(element);
    const box = await target.boundingBox();
    
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      
      let endX = startX;
      let endY = startY;
      
      switch (direction) {
        case 'left':
          endX = startX - 100;
          break;
        case 'right':
          endX = startX + 100;
          break;
        case 'up':
          endY = startY - 100;
          break;
        case 'down':
          endY = startY + 100;
          break;
      }
      
      await this.page.touchscreen.move(startX, startY);
      await this.page.touchscreen.down();
      await this.page.touchscreen.move(endX, endY);
      await this.page.touchscreen.up();
    }
  }

  async verifyNoHorizontalScroll() {
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = this.page.viewportSize()?.width || 0;
    
    expect(bodyWidth, 'Page should not have horizontal overflow').toBeLessThanOrEqual(viewportWidth + 10); // Allow small tolerance
  }
}

// Export the enhanced expect with custom matchers
export { expect };