const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Testing OAuth functionality...');
  
  // Navigate to dashboard
  await page.goto('http://localhost:3008/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Check if page loaded properly
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check for any error messages
  const errorElements = await page.locator('.error, [data-nextjs-error], .next-error').allTextContents();
  if (errorElements.length > 0) {
    console.log('Error elements found:', errorElements);
  }
  
  // Check for QuickActions container
  const quickActions = await page.locator('[class*="QuickActions"], [class*="space-x-2"]').count();
  console.log('QuickActions containers found:', quickActions);
  
  // Look for all buttons
  const allButtons = await page.locator('button').allTextContents();
  console.log('All buttons found:', allButtons);
  
  // Look for the OAuth button by different selectors
  const oauthButton1 = await page.locator('text=Setup OAuth');
  const oauthButton2 = await page.locator('button:has-text("Setup OAuth")');
  const oauthButton3 = await page.locator('[data-testid="oauth-button"]');
  
  console.log('OAuth button count (text):', await oauthButton1.count());
  console.log('OAuth button count (has-text):', await oauthButton2.count());
  console.log('OAuth button count (data-testid):', await oauthButton3.count());
  
  if (allButtons.length > 0) {
    console.log('Clicking OAuth button...');
    
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('oauth')) {
        console.log('OAuth request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('oauth')) {
        console.log('OAuth response:', response.status(), response.url());
      }
    });
    
    // Try to click the OAuth button if found
    if (await oauthButton2.count() > 0) {
      await oauthButton2.click();
    } else {
      console.log('No OAuth button to click');
    }
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    console.log('OAuth test completed');
  } else {
    console.log('OAuth button not found');
  }
  
  await browser.close();
})();