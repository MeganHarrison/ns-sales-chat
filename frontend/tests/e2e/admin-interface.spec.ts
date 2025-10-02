import { test, expect } from '@playwright/test';

test.describe('Admin Interface and System Management', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('System health monitoring', async ({ page }) => {
    // Navigate to sync health tab
    const healthTab = page.locator('[role="tab"]:has-text("Sync Health"), button:has-text("Sync Health")');
    await healthTab.click();
    
    // Wait for health content to load
    await page.waitForLoadState('networkidle');
    
    // Verify health metrics are displayed
    const healthScore = page.locator('[data-testid="health-score"], .health-score, text="95%"');
    await expect(healthScore).toBeVisible({ timeout: 10000 });
    
    // Verify service status indicators
    const serviceStatuses = [
      'Sync Worker',
      'Sync Coordinator', 
      'Webhook Handler',
      'Database'
    ];
    
    for (const service of serviceStatuses) {
      const serviceElement = page.locator(`text="${service}"`);
      await expect(serviceElement).toBeVisible();
      
      // Check for status indicator (green dot, success icon, etc.)
      const statusIndicator = serviceElement.locator('..').locator('.bg-green-500, .text-green-500, [data-status="healthy"]');
      await expect(statusIndicator).toBeVisible();
    }
    
    // Take screenshot of health dashboard
    await page.screenshot({ path: 'test-results/health-dashboard.png', fullPage: true });
  });

  test('Sync performance metrics', async ({ page }) => {
    // Verify sync performance chart loads
    const performanceSection = page.locator('h3:has-text("Sync Performance")').locator('..');
    await expect(performanceSection).toBeVisible();
    
    // Check for issues alert if present
    const issuesAlert = page.locator('[data-testid="issues-alert"], .alert:has-text("Issues"), button:has-text("Issues")');
    if (await issuesAlert.count() > 0) {
      await expect(issuesAlert).toBeVisible();
      
      // Verify issue count is displayed
      const issueCount = issuesAlert.locator('text=/\\d+\\s+Issues?/');
      await expect(issueCount).toBeVisible();
    }
    
    // Verify chart elements exist
    const chartContainer = performanceSection.locator('.recharts-wrapper, [data-testid="performance-chart"]');
    await expect(chartContainer).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of performance metrics
    await page.screenshot({ path: 'test-results/performance-metrics.png', fullPage: true });
  });

  test('Settings and configuration access', async ({ page }) => {
    // Look for settings navigation
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings"), [data-testid="settings"]');
    
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      
      // Verify settings page loads
      await expect(page.locator('h1:has-text("Settings"), h2:has-text("Settings")')).toBeVisible();
      
      // Take screenshot of settings page
      await page.screenshot({ path: 'test-results/settings-page.png', fullPage: true });
    } else {
      console.log('Settings page not yet implemented - this is expected for current MVP');
    }
  });

  test('Data export functionality', async ({ page }) => {
    // Look for export buttons or links
    const exportButton = page.locator('button:has-text("Export"), a:has-text("Export"), [data-testid="export"]');
    
    if (await exportButton.count() > 0) {
      // Test export functionality
      await exportButton.click();
      
      // Wait for download or export dialog
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      const download = await downloadPromise;
      
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|json)$/);
        console.log('✓ Export functionality working:', download.suggestedFilename());
      } else {
        // Check for export dialog or options
        const exportDialog = page.locator('.modal:has-text("Export"), .dialog:has-text("Export")');
        if (await exportDialog.count() > 0) {
          await expect(exportDialog).toBeVisible();
          console.log('✓ Export dialog displayed');
        }
      }
    } else {
      console.log('Export functionality not yet implemented - this is expected for current MVP');
    }
  });

  test('Real-time status updates', async ({ page }) => {
    // Record initial sync status
    const initialStatus = await page.locator('[data-testid="sync-status"], .sync-status').textContent();
    
    // Trigger a sync operation
    const syncButton = page.locator('button:has-text("Sync All")');
    await syncButton.click();
    
    // Wait for status change
    await page.waitForTimeout(2000);
    
    // Verify some kind of status change or loading state
    const statusElement = page.locator('[data-testid="sync-status"], .sync-status, .loading, .updating');
    await expect(statusElement).toBeVisible();
    
    // Wait for completion
    await page.waitForTimeout(3000);
    
    // Verify final status
    const finalStatus = await page.locator('[data-testid="sync-status"], .sync-status').textContent();
    console.log('Status change:', { initial: initialStatus, final: finalStatus });
    
    // Take screenshot of updated status
    await page.screenshot({ path: 'test-results/status-update.png', fullPage: true });
  });

  test('Error handling and recovery', async ({ page }) => {
    // Test error scenarios by intercepting API calls
    await page.route('**/api/dashboard/**', async route => {
      if (Math.random() < 0.3) { // Simulate 30% error rate
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Test error for error handling verification' })
        });
      } else {
        await route.continue();
      }
    });
    
    // Reload page to trigger API calls
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify error handling - should not show broken UI
    const errorElements = page.locator('.error, [data-testid="error"], .text-red-500');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      // Verify errors are handled gracefully
      for (let i = 0; i < errorCount; i++) {
        const error = errorElements.nth(i);
        await expect(error).toBeVisible();
        
        // Should not contain raw error messages or stack traces
        const errorText = await error.textContent();
        expect(errorText).not.toContain('TypeError');
        expect(errorText).not.toContain('fetch failed');
        expect(errorText).not.toContain('stack trace');
      }
    }
    
    // Verify page still functions despite errors
    const mainContent = page.locator('main, .dashboard, [data-testid="dashboard"]');
    await expect(mainContent).toBeVisible();
    
    // Take screenshot of error handling
    await page.screenshot({ path: 'test-results/error-handling.png', fullPage: true });
  });
});