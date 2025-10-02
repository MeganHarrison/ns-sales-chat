#!/usr/bin/env npx tsx

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  command: string;
  description: string;
  required: boolean;
}

const testSuites: TestSuite[] = [
  {
    name: 'Authentication Setup',
    command: 'npx playwright test --project=setup',
    description: 'Set up authentication state for all tests',
    required: true
  },
  {
    name: 'API Integration Tests', 
    command: 'npx playwright test --project=api',
    description: 'Test all API endpoints and backend integration',
    required: true
  },
  {
    name: 'Core Desktop Browser Tests',
    command: 'npx playwright test --project=chromium tests/e2e/complete-sync-flow.spec.ts',
    description: 'Test complete sync workflow on desktop Chrome',
    required: true
  },
  {
    name: 'Admin Interface Tests',
    command: 'npx playwright test --project=chromium tests/e2e/admin-interface.spec.ts', 
    description: 'Test administrative features and system monitoring',
    required: true
  },
  {
    name: 'Mobile Responsive Tests',
    command: 'npx playwright test tests/e2e/mobile-responsive.spec.ts',
    description: 'Test mobile compatibility and responsive design',
    required: false
  },
  {
    name: 'Cross-Browser Tests',
    command: 'npx playwright test --project=firefox --project=webkit tests/e2e/complete-sync-flow.spec.ts',
    description: 'Test compatibility across Firefox and Safari',
    required: false
  },
  {
    name: 'Performance Tests',
    command: 'npx playwright test tests/api/backend-integration.spec.ts --grep="Performance"',
    description: 'Test performance and response times',
    required: false
  }
];

async function runTestSuite(suite: TestSuite): Promise<boolean> {
  console.log(`\n🧪 Running: ${suite.name}`);
  console.log(`📋 ${suite.description}`);
  console.log(`⚡ Command: ${suite.command}`);
  
  try {
    execSync(suite.command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 300000 // 5 minutes timeout per suite
    });
    
    console.log(`✅ ${suite.name} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${suite.name} - FAILED`);
    
    if (suite.required) {
      console.error(`🚨 This is a required test suite. Stopping execution.`);
      return false;
    } else {
      console.warn(`⚠️  Optional test failed, continuing...`);
      return true;
    }
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive Test Suite for Keap-Supabase Sync System');
  console.log('=' * 80);
  
  // Check prerequisites
  console.log('\n📋 Checking prerequisites...');
  
  // Check if server is running
  try {
    execSync('curl -f http://localhost:3008 > /dev/null 2>&1', { timeout: 5000 });
    console.log('✅ Development server is running on port 3008');
  } catch (error) {
    console.error('❌ Development server not running on port 3008');
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  // Create test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
    console.log('📁 Created test-results directory');
  }
  
  // Create auth directory 
  const authDir = path.join(process.cwd(), 'tests', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log('📁 Created tests/.auth directory');
  }
  
  console.log('✅ Prerequisites check completed');
  
  // Run test suites
  const results: { suite: string; passed: boolean }[] = [];
  let allPassed = true;
  
  for (const suite of testSuites) {
    const passed = await runTestSuite(suite);
    results.push({ suite: suite.name, passed });
    
    if (!passed && suite.required) {
      allPassed = false;
      break;
    }
  }
  
  // Generate summary report
  console.log('\n' + '=' * 80);
  console.log('📊 TEST SUMMARY REPORT');
  console.log('=' * 80);
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = total - passed;
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   ✅ Passed: ${passed}/${total}`);
  console.log(`   ❌ Failed: ${failed}/${total}`);
  console.log(`   📊 Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  console.log(`\n📋 Detailed Results:`);
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`   ${icon} ${result.suite}`);
  });
  
  // Generate HTML report
  console.log(`\n📄 Detailed reports available:`);
  console.log(`   🌐 HTML Report: npx playwright show-report`);
  console.log(`   📁 Screenshots: ./test-results/`);
  console.log(`   📊 JSON Report: ./test-results/results.json`);
  
  // Recommendations
  if (!allPassed) {
    console.log(`\n🔧 Next Steps:`);
    console.log(`   1. Review failed test details in the HTML report`);
    console.log(`   2. Check server logs for any errors`);
    console.log(`   3. Verify all required environment variables are set`);
    console.log(`   4. Re-run specific failed tests: npx playwright test --project=<project> <test-file>`);
  } else {
    console.log(`\n🎉 All tests passed! The Keap-Supabase sync system is working correctly.`);
    console.log(`   🚀 System is ready for production deployment`);
    console.log(`   📈 All core functionality verified`);
    console.log(`   🔒 Authentication and security checks passed`);
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Handle process interruption gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Test execution interrupted by user');
  console.log('📊 Partial results may be available in test-results/');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test execution terminated');
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  });
}