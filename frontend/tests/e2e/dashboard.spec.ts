import { test, expect } from '@playwright/test'

test.describe('Keap-Supabase Dashboard', () => {
  test('should load dashboard successfully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
    
    // Take screenshot of initial load
    await page.screenshot({ path: 'test-results/dashboard-initial-load.png', fullPage: true })
    
    // Check that the dashboard header loads
    await expect(page.locator('h1')).toContainText('Keap-Supabase Sync Dashboard')
    
    // Check that the description is present
    await expect(page.locator('text=Monitor and manage your bidirectional sync operations')).toBeVisible()
    
    // Wait for any loading states to complete
    await page.waitForTimeout(2000)
    
    // Take screenshot after loading
    await page.screenshot({ path: 'test-results/dashboard-loaded.png', fullPage: true })
  })

  test('should display dashboard sections', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Keap-Supabase Sync Dashboard")')
    
    // Check for main dashboard sections
    await expect(page.locator('text=Overview')).toBeVisible()
    await expect(page.locator('text=Contacts')).toBeVisible()
    await expect(page.locator('text=Orders')).toBeVisible()
    await expect(page.locator('text=Sync Health')).toBeVisible()
    
    // Take screenshot of tab section
    await page.screenshot({ path: 'test-results/dashboard-tabs.png' })
  })

  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Keap-Supabase Sync Dashboard")')
    
    // Test Overview tab (default)
    await expect(page.locator('[data-state="active"]:has-text("Overview")')).toBeVisible()
    await page.screenshot({ path: 'test-results/overview-tab.png', fullPage: true })
    
    // Click Contacts tab
    await page.click('text=Contacts')
    await expect(page.locator('[data-state="active"]:has-text("Contacts")')).toBeVisible()
    await page.screenshot({ path: 'test-results/contacts-tab.png', fullPage: true })
    
    // Click Orders tab
    await page.click('text=Orders')
    await expect(page.locator('[data-state="active"]:has-text("Orders")')).toBeVisible()
    await page.screenshot({ path: 'test-results/orders-tab.png', fullPage: true })
    
    // Click Sync Health tab
    await page.click('text=Sync Health')
    await expect(page.locator('[data-state="active"]:has-text("Sync Health")')).toBeVisible()
    await page.screenshot({ path: 'test-results/sync-health-tab.png', fullPage: true })
  })

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Keap-Supabase Sync Dashboard")')
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true })
    
    // Check that content is still accessible on mobile
    await expect(page.locator('h1')).toContainText('Keap-Supabase Sync Dashboard')
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.screenshot({ path: 'test-results/dashboard-tablet.png', fullPage: true })
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true })
  })

  test('should display charts and components', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Keap-Supabase Sync Dashboard")')
    
    // Look for chart containers (they may show loading states)
    const chartElements = page.locator('[class*="recharts"], [class*="chart"]')
    
    // Wait a bit for any async loading
    await page.waitForTimeout(3000)
    
    // Take screenshot of the entire dashboard with any loaded content
    await page.screenshot({ path: 'test-results/dashboard-with-charts.png', fullPage: true })
    
    // Check that we have some kind of content in the main areas
    await expect(page.locator('text=Sync Performance')).toBeVisible()
    await expect(page.locator('text=Recent Sync Activities')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Keap-Supabase Sync Dashboard")')
    
    // Wait for any async operations to complete
    await page.waitForTimeout(5000)
    
    // Take screenshot to show error handling
    await page.screenshot({ path: 'test-results/dashboard-error-handling.png', fullPage: true })
    
    // The dashboard should still be functional even with API errors
    await expect(page.locator('h1')).toContainText('Keap-Supabase Sync Dashboard')
    
    // Should not have any unhandled JavaScript errors
    const errors = []
    page.on('pageerror', error => errors.push(error))
    
    // Navigate around to ensure no critical errors
    await page.click('text=Contacts')
    await page.click('text=Orders')
    await page.click('text=Overview')
    
    // Check that we didn't get critical JavaScript errors
    expect(errors.length).toBe(0)
  })
})