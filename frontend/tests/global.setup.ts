import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Create .auth directory if it doesn't exist
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log('📁 Created .auth directory');
  }

  // Create .gitignore for auth directory if it doesn't exist
  const gitignorePath = path.join(authDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '*\n!.gitignore\n');
    console.log('📝 Created .auth/.gitignore');
  }

  // Verify test server is running
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3008';
  console.log(`🌐 Testing server availability at ${baseURL}`);
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto(baseURL, { timeout: 10000 });
    const title = await page.title();
    console.log(`✅ Server is running - page title: "${title}"`);
    
    await browser.close();
  } catch (error) {
    console.error(`❌ Server not available at ${baseURL}:`, error.message);
    console.log('Please ensure the development server is running with: npm run dev');
    process.exit(1);
  }

  // Set up environment variables for tests
  process.env.PLAYWRIGHT_TEST_BASE_URL = baseURL;
  
  console.log('✨ Global setup completed successfully');
}

export default globalSetup;