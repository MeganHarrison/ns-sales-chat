import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  // Generate test summary
  const resultsPath = path.join(__dirname, '../test-results/results.json');
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const stats = results.stats || {};
      
      console.log('📊 Test Summary:');
      console.log(`   ✅ Passed: ${stats.passed || 0}`);
      console.log(`   ❌ Failed: ${stats.failed || 0}`);
      console.log(`   ⏭️  Skipped: ${stats.skipped || 0}`);
      console.log(`   ⏱️  Duration: ${stats.duration || 'N/A'}ms`);
      
      if (stats.failed > 0) {
        console.log('❌ Some tests failed. Check the HTML report for details.');
      } else {
        console.log('✨ All tests passed successfully!');
      }
    } catch (error) {
      console.log('⚠️  Could not parse test results');
    }
  }

  // Clean up temporary files (but keep .auth for reuse)
  const tempDirs = [
    path.join(__dirname, '../test-results/tmp'),
    path.join(__dirname, '../playwright-report/tmp')
  ];

  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`🗑️  Cleaned up ${dir}`);
    }
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;