// End-to-End Testing Templates for Keap-Supabase Sync System

// ===============================================================
// tests/e2e/dashboard.spec.ts
// ===============================================================
import { test, expect } from '@playwright/test'

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-header"]')
  })

  test('should load dashboard with metrics', async ({ page }) => {
    // Check dashboard header
    await expect(page.locator('h1')).toContainText('Keap-Supabase Sync Dashboard')
    
    // Check that metric cards are visible
    await expect(page.locator('[data-testid="sync-status-card"]')).toBeVisible()
    
    // Check that charts load
    await expect(page.locator('[data-testid="kpi-charts"]')).toBeVisible()
    
    // Wait for data to load (should show no errors)
    await page.waitForTimeout(2000)
    const errorElements = page.locator('[data-testid="error-message"]')
    await expect(errorElements).toHaveCount(0)
  })

  test('should display sync health metrics', async ({ page }) => {
    // Navigate to health tab
    await page.click('text=Sync Health')
    
    // Check health metrics are displayed
    await expect(page.locator('[data-testid="health-overview"]')).toBeVisible()
    
    // Check service status indicators
    const serviceStatuses = page.locator('[data-testid="service-status-indicator"]')
    await expect(serviceStatuses).toHaveCountGreaterThan(0)
  })

  test('should trigger manual sync', async ({ page }) => {
    // Find and click manual sync button
    await page.click('[data-testid="manual-sync-trigger"]')
    
    // Fill in sync form
    await page.fill('[data-testid="keap-account-input"]', 'test-account-123')
    
    // Select sync type
    await page.selectOption('[data-testid="sync-type-select"]', 'contacts')
    
    // Submit sync request
    await page.click('[data-testid="sync-submit-button"]')
    
    // Check for success message
    await expect(page.locator('[data-testid="sync-success-message"]')).toBeVisible()
  })

  test('should display recent activities', async ({ page }) => {
    // Navigate to overview tab
    await page.click('text=Overview')
    
    // Check recent activities section
    await expect(page.locator('[data-testid="recent-activities"]')).toBeVisible()
    
    // Should have activity items or empty state
    const activities = page.locator('[data-testid="activity-item"]')
    const emptyState = page.locator('[data-testid="no-activities"]')
    
    const hasActivities = await activities.count() > 0
    const hasEmptyState = await emptyState.isVisible()
    
    expect(hasActivities || hasEmptyState).toBeTruthy()
  })

  test('should handle conflict alerts', async ({ page }) => {
    // Check if conflict alerts are displayed
    const conflictAlert = page.locator('[data-testid="conflict-alert"]')
    
    if (await conflictAlert.isVisible()) {
      // If conflicts exist, check alert functionality
      await expect(conflictAlert).toContainText('conflict')
      
      // Click to view conflicts
      await conflictAlert.click()
      
      // Should navigate to conflicts view
      await expect(page.locator('[data-testid="conflicts-list"]')).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Dashboard should still be usable
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
    
    // Navigation should work
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  })
})

// ===============================================================
// tests/e2e/sync-operations.spec.ts
// ===============================================================
test.describe('Sync Operations E2E', () => {
  test('should complete full sync workflow', async ({ page }) => {
    // Navigate to sync dashboard
    await page.goto('/dashboard')
    
    // Trigger manual sync
    await page.click('[data-testid="manual-sync-trigger"]')
    
    // Fill form with test data
    await page.fill('[data-testid="keap-account-input"]', 'test-account')
    await page.selectOption('[data-testid="sync-type-select"]', 'all')
    
    // Submit sync
    await page.click('[data-testid="sync-submit-button"]')
    
    // Wait for sync to complete (with timeout)
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
    
    // Check for completion
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 30000 })
    
    // Verify data appears in dashboard
    await page.reload()
    await expect(page.locator('[data-testid="total-contacts"]')).not.toContainText('0')
  })

  test('should handle sync errors gracefully', async ({ page }) => {
    // Navigate to sync dashboard
    await page.goto('/dashboard')
    
    // Trigger sync with invalid data
    await page.click('[data-testid="manual-sync-trigger"]')
    await page.fill('[data-testid="keap-account-input"]', 'invalid-account')
    await page.click('[data-testid="sync-submit-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="sync-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-error"]')).toContainText('error')
  })
})

// ===============================================================
// tests/e2e/api-endpoints.spec.ts
// ===============================================================
test.describe('API Endpoints E2E', () => {
  test('should return dashboard metrics', async ({ request }) => {
    const response = await request.get('/api/dashboard/metrics')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('totalContacts')
    expect(data).toHaveProperty('totalOrders')
    expect(data).toHaveProperty('syncHealth')
  })

  test('should return trend data', async ({ request }) => {
    const response = await request.get('/api/dashboard/trends?days=7')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(Array.isArray(data)).toBeTruthy()
  })

  test('should handle invalid parameters', async ({ request }) => {
    const response = await request.get('/api/dashboard/trends?days=invalid')
    
    expect(response.status()).toBe(400)
  })

  test('should trigger sync via API', async ({ request }) => {
    const response = await request.post('/api/sync/trigger', {
      data: {
        keapAccountId: 'test-account',
        syncType: 'contacts'
      }
    })
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('success')
  })

  test('should test Keap connection', async ({ request }) => {
    const response = await request.post('/api/keap/test-connection', {
      data: {
        accessToken: 'test-token'
      }
    })
    
    // Should handle the test (may fail due to invalid token, but should not error)
    expect([200, 400, 401]).toContain(response.status())
  })
})

// ===============================================================
// tests/e2e/conflict-resolution.spec.ts
// ===============================================================
test.describe('Conflict Resolution E2E', () => {
  test('should display conflicts when they exist', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for conflict alerts
    const conflictAlert = page.locator('[data-testid="conflict-alert"]')
    
    if (await conflictAlert.isVisible()) {
      // Click to view conflicts
      await conflictAlert.click()
      
      // Should show conflict details
      await expect(page.locator('[data-testid="conflict-details"]')).toBeVisible()
      
      // Should have resolution options
      await expect(page.locator('[data-testid="resolve-conflict-button"]')).toBeVisible()
    }
  })

  test('should resolve conflicts', async ({ page }) => {
    // This test would need test data with actual conflicts
    // For now, just verify the UI exists
    await page.goto('/dashboard')
    
    // Navigation should work
    const conflictTab = page.locator('text=Conflicts')
    if (await conflictTab.isVisible()) {
      await conflictTab.click()
      await expect(page.locator('[data-testid="conflicts-section"]')).toBeVisible()
    }
  })
})

// ===============================================================
// tests/e2e/performance.spec.ts
// ===============================================================
test.describe('Performance Tests', () => {
  test('should load dashboard quickly', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await page.waitForSelector('[data-testid="dashboard-header"]')
    
    const loadTime = Date.now() - startTime
    
    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('should handle large datasets', async ({ page }) => {
    // This would test with large amounts of data
    await page.goto('/dashboard')
    
    // Navigate to data-heavy sections
    await page.click('text=Orders')
    
    // Should not timeout or crash
    await expect(page.locator('[data-testid="orders-section"]')).toBeVisible({ timeout: 10000 })
  })
})

// ===============================================================
// Test Configuration and Helpers
// ===============================================================
// playwright.config.ts additions:
/*
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
*/