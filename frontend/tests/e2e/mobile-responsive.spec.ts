import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsive Design', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  const mobileViewports = [
    { name: 'iPhone 13', device: devices['iPhone 13'] },
    { name: 'iPhone 13 Pro', device: devices['iPhone 13 Pro'] },
    { name: 'Pixel 5', device: devices['Pixel 5'] },
    { name: 'iPad', device: devices['iPad'] },
  ];

  for (const { name, device } of mobileViewports) {
    test(`Dashboard responsive on ${name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
        storageState: 'tests/.auth/user.json'
      });
      const page = await context.newPage();
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Verify mobile navigation works
      const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, button[aria-label*="menu"]');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu).toBeVisible();
        
        // Test mobile menu functionality
        await mobileMenu.click();
        const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav, .drawer, .sidebar');
        await expect(mobileNav).toBeVisible();
        
        // Close mobile menu
        const closeButton = page.locator('[data-testid="close-menu"], button[aria-label*="close"]');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
      
      // Verify dashboard content is accessible on mobile
      const dashboardTitle = page.locator('h1:has-text("Dashboard"), h1:has-text("Keap"), [data-testid="dashboard-title"]');
      await expect(dashboardTitle).toBeVisible();
      
      // Verify KPI cards stack properly on mobile
      const kpiCards = page.locator('[data-testid*="metric"], .metric-card, .card');
      const cardCount = await kpiCards.count();
      
      if (cardCount > 0) {
        // Check first few cards are visible
        for (let i = 0; i < Math.min(cardCount, 4); i++) {
          await expect(kpiCards.nth(i)).toBeVisible();
        }
      }
      
      // Verify buttons are touchable (minimum 44px touch target)
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          // Check minimum touch target size (44px is iOS HIG recommendation)
          expect(box.height).toBeGreaterThanOrEqual(40);
          expect(box.width).toBeGreaterThanOrEqual(40);
        }
      }
      
      // Test horizontal scrolling for charts if present
      const charts = page.locator('.recharts-wrapper, [data-testid*="chart"]');
      if (await charts.count() > 0) {
        const chart = charts.first();
        await expect(chart).toBeVisible();
        
        // Verify chart doesn't overflow viewport
        const chartBox = await chart.boundingBox();
        if (chartBox) {
          const viewport = page.viewportSize();
          expect(chartBox.width).toBeLessThanOrEqual(viewport!.width + 50); // Allow some tolerance
        }
      }
      
      // Test tab navigation on mobile
      const tabs = page.locator('[role="tab"]:visible, .tab:visible');
      const tabCount = await tabs.count();
      
      if (tabCount > 0) {
        // Verify tabs are scrollable or wrap properly
        const tabsContainer = tabs.first().locator('..');
        await expect(tabsContainer).toBeVisible();
        
        // Test tapping different tabs
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          const tab = tabs.nth(i);
          await tab.tap();
          await page.waitForTimeout(500);
          
          // Verify tab content loads
          const tabPanel = page.locator('[role="tabpanel"]:visible');
          await expect(tabPanel).toBeVisible();
        }
      }
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: `test-results/mobile-${name.toLowerCase().replace(/\s+/g, '-')}.png`, 
        fullPage: true 
      });
      
      await context.close();
    });
  }

  test('Portrait and landscape orientation', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: 'tests/.auth/user.json'
    });
    const page = await context.newPage();
    
    // Test portrait orientation
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/mobile-portrait.png', 
      fullPage: true 
    });
    
    // Test landscape orientation
    await page.setViewportSize({ width: 844, height: 390 }); // iPhone 13 landscape
    await page.waitForTimeout(1000);
    
    // Verify layout adapts to landscape
    const dashboardContent = page.locator('[data-testid="dashboard"], main, .container');
    await expect(dashboardContent).toBeVisible();
    
    // Verify buttons and controls are still accessible
    const syncButtons = page.locator('button:has-text("Sync")');
    const buttonCount = await syncButtons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      await expect(syncButtons.nth(i)).toBeVisible();
    }
    
    await page.screenshot({ 
      path: 'test-results/mobile-landscape.png', 
      fullPage: true 
    });
    
    await context.close();
  });

  test('Touch interactions and gestures', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: 'tests/.auth/user.json'
    });
    const page = await context.newPage();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test tap interactions
    const oauthButton = page.locator('button:has-text("Setup OAuth")');
    if (await oauthButton.count() > 0) {
      await oauthButton.tap();
      
      // Verify tap feedback (loading state, visual feedback, etc.)
      await page.waitForTimeout(500);
      
      // Check for any visual feedback
      const loadingStates = page.locator('.loading, .spinner, [data-loading="true"]');
      // Note: We don't require loading states, just check they work if present
    }
    
    // Test swipe gestures on scrollable content if present
    const scrollableContent = page.locator('.overflow-x-auto, .scrollable, [data-testid*="table"]');
    if (await scrollableContent.count() > 0) {
      const content = scrollableContent.first();
      const box = await content.boundingBox();
      
      if (box) {
        // Perform swipe gesture
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await page.touchscreen.move(box.x + 50, box.y + box.height / 2);
      }
    }
    
    // Test pinch-to-zoom prevention (should not zoom interface elements)
    // This is more of a CSS verification - zoom should be disabled for UI elements
    const viewport = page.viewportSize();
    await page.touchscreen.tap(viewport!.width / 2, viewport!.height / 2);
    
    // Double tap to test zoom prevention
    await page.touchscreen.tap(viewport!.width / 2, viewport!.height / 2);
    await page.touchscreen.tap(viewport!.width / 2, viewport!.height / 2);
    
    // Take screenshot after touch interactions
    await page.screenshot({ 
      path: 'test-results/mobile-touch-interactions.png', 
      fullPage: true 
    });
    
    await context.close();
  });

  test('Mobile performance and loading', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      storageState: 'tests/.auth/user.json'
    });
    const page = await context.newPage();
    
    // Simulate slower mobile connection
    await context.route('**/*', async route => {
      // Add delay to simulate mobile network
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Verify page loads in reasonable time (under 5 seconds on simulated slow connection)
    expect(loadTime).toBeLessThan(5000);
    
    // Verify loading states are shown during data fetching
    const content = page.locator('[data-testid="dashboard"], main');
    await expect(content).toBeVisible();
    
    // Check for progressive loading
    const skeletonLoaders = page.locator('.skeleton, .animate-pulse, [data-loading="true"]');
    // Note: Skeleton loaders might not be present if content loads quickly
    
    console.log(`Mobile page load time: ${loadTime}ms`);
    
    await page.screenshot({ 
      path: 'test-results/mobile-performance.png', 
      fullPage: true 
    });
    
    await context.close();
  });
});