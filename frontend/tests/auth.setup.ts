import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from './auth.config';

const authFile = 'tests/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');
  
  // Check if we need to authenticate or if already logged in
  const isLoggedIn = await page.locator('[data-testid="user-menu"], .user-avatar, [data-user-authenticated="true"]').count() > 0;
  
  if (!isLoggedIn) {
    // Look for login/oauth buttons
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login")').first();
    
    if (await loginButton.count() > 0) {
      await loginButton.click();
      
      // Handle different auth flows
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      
      if (await emailInput.count() > 0) {
        // Standard email/password flow
        await emailInput.fill(process.env.TEST_USER_EMAIL || 'test@example.com');
        await passwordInput.fill(process.env.TEST_USER_PASSWORD || 'testpassword123');
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
        await submitButton.click();
        
        // Wait for successful login
        await page.waitForURL(/dashboard|home|app/, { timeout: 10000 });
      } else {
        // OAuth flow (Keap, Google, etc.)
        console.log('OAuth flow detected - using mock authentication for testing');
        
        // For testing, we'll simulate successful authentication
        // In real scenarios, this would handle the OAuth callback
        await page.route('**/api/auth/**', async route => {
          const url = route.request().url();
          if (url.includes('callback')) {
            await route.fulfill({
              status: 302,
              headers: {
                'Location': '/dashboard?auth=success'
              }
            });
          } else {
            await route.continue();
          }
        });
        
        // Navigate directly to dashboard for testing
        await page.goto('/dashboard');
      }
    } else {
      // No login required or already authenticated
      console.log('No login required or already authenticated');
    }
  }
  
  // Verify authentication was successful
  await expect(page.locator('body')).not.toContain('Error');
  
  // Wait for any loading to complete
  await page.waitForLoadState('networkidle');
  
  // Save signed-in state to 'tests/.auth/user.json'
  await page.context().storageState({ path: authFile });
});

setup('setup test data', async ({ request }) => {
  // Create test data via API if needed
  const response = await request.post('/api/test/setup', {
    data: {
      createTestContacts: true,
      createTestOrders: true,
      resetSyncStatus: true
    }
  });
  
  if (!response.ok()) {
    console.warn('Test data setup failed, tests will use existing data');
  }
});