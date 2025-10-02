# Comprehensive Testing Suite for Keap-Supabase Sync System

This testing suite provides complete end-to-end validation of the Keap-Supabase bidirectional sync system using Playwright with authentication patterns.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:install

# Run all tests
npm test

# Run specific test suites
npm run test:quick       # Quick smoke test
npm run test:api         # API integration tests
npm run test:mobile      # Mobile responsive tests
npm run test:admin       # Admin interface tests
```

## 📁 Test Structure

```
tests/
├── .auth/                    # Authentication storage (gitignored)
│   ├── user.json            # Standard user auth state
│   ├── admin.json           # Admin user auth state
│   └── .gitignore           # Ignore auth files
├── e2e/                     # End-to-end browser tests
│   ├── complete-sync-flow.spec.ts    # Core sync functionality
│   ├── admin-interface.spec.ts       # Admin features
│   └── mobile-responsive.spec.ts     # Mobile testing
├── api/                     # API integration tests
│   └── backend-integration.spec.ts   # Backend API tests
├── fixtures/                # Test helpers and utilities
│   └── test-helpers.ts      # Custom fixtures and helpers
├── auth.setup.ts           # Authentication setup
├── auth.config.ts          # Auth configuration
├── cleanup.setup.ts        # Test cleanup
├── global.setup.ts         # Global test setup
├── global.teardown.ts      # Global test teardown
├── run-all-tests.ts        # Comprehensive test runner
└── README.md               # This file
```

## 🔑 Authentication Strategy

The test suite implements Playwright's recommended authentication pattern:

1. **Setup Phase**: Authenticate once and save state to `.auth/user.json`
2. **Test Execution**: All tests reuse saved authentication state
3. **Isolation**: Each test runs in isolated browser context
4. **Multi-Role**: Support for different user roles (user, admin, viewer)

### Authentication Flow

```typescript
// Tests automatically use saved authentication state
test.use({ storageState: 'tests/.auth/user.json' });

// Authentication is handled by auth.setup.ts
// - Detects OAuth vs email/password flows
// - Handles mock authentication for testing
// - Saves state for reuse across all tests
```

## 🧪 Test Categories

### 1. Core Sync Flow Tests (`complete-sync-flow.spec.ts`)
- ✅ OAuth setup and authentication
- ✅ Manual sync operations (All, Contacts, Orders)
- ✅ Dashboard data loading and real-time updates
- ✅ Recent sync activities display
- ✅ Tab navigation and content
- ✅ Conflict alerts and resolution
- ✅ API endpoint validation

### 2. Admin Interface Tests (`admin-interface.spec.ts`)
- ✅ System health monitoring
- ✅ Sync performance metrics
- ✅ Settings and configuration access
- ✅ Data export functionality
- ✅ Real-time status updates
- ✅ Error handling and recovery

### 3. Mobile Responsive Tests (`mobile-responsive.spec.ts`)
- ✅ Dashboard responsive on multiple devices
- ✅ Portrait and landscape orientations
- ✅ Touch interactions and gestures
- ✅ Mobile performance and loading
- ✅ Touch target size validation
- ✅ No horizontal overflow verification

### 4. Backend Integration Tests (`backend-integration.spec.ts`)
- ✅ Supabase database integration
- ✅ Keap API integration
- ✅ Cloudflare Workers integration
- ✅ Error handling and recovery
- ✅ Performance and monitoring
- ✅ Rate limiting protection

## 📊 Test Projects

The Playwright configuration includes multiple test projects:

| Project | Description | Browser | Authentication |
|---------|-------------|---------|----------------|
| `setup` | Authentication setup | Chrome | Creates auth state |
| `chromium` | Main desktop tests | Chrome | Uses saved auth |
| `firefox` | Cross-browser testing | Firefox | Uses saved auth |
| `webkit` | Safari compatibility | Safari | Uses saved auth |
| `Mobile Chrome` | Mobile testing | Mobile Chrome | Uses saved auth |
| `Mobile Safari` | iOS testing | Mobile Safari | Uses saved auth |
| `api` | API-only tests | None | Uses saved auth |
| `admin` | Admin interface | Chrome | Uses admin auth |

## 🏃‍♂️ Running Tests

### Individual Test Commands

```bash
# Authentication setup (run first)
npm run test:setup

# Core functionality tests
npm run test:quick

# API integration tests
npm run test:api

# Mobile responsive tests
npm run test:mobile

# Admin interface tests
npm run test:admin

# Cross-browser tests
npm run test:browser

# Debug mode (step through tests)
npm run test:debug

# Headed mode (see browser)
npm run test:headed

# View test report
npm run test:report
```

### Comprehensive Test Runner

```bash
# Run the complete test suite with intelligent reporting
npm test
```

The comprehensive test runner (`tests/run-all-tests.ts`) provides:
- ✅ Prerequisite checking (server availability)
- ✅ Sequential test execution with dependency management
- ✅ Detailed progress reporting
- ✅ Failure analysis and recommendations
- ✅ Summary reports with success rates
- ✅ Graceful error handling

## 🔧 Test Helpers and Fixtures

The test suite includes custom helpers in `fixtures/test-helpers.ts`:

### DashboardHelpers
```typescript
const dashboard = new DashboardHelpers(page);
await dashboard.waitForMetricsToLoad();
await dashboard.triggerSync('contacts');
await dashboard.switchTab('Sync Health');
await dashboard.takeScreenshot('dashboard-state');
```

### APIHelpers
```typescript
const api = new APIHelpers(request);
await api.testEndpoint('/api/dashboard/health');
await api.testSyncTrigger('contacts');
await api.testOAuthEndpoint('initiate');
```

### MobileHelpers
```typescript
const mobile = new MobileHelpers(page);
await mobile.testTouchTarget('button', 44);
await mobile.testSwipeGesture('.table', 'left');
await mobile.verifyNoHorizontalScroll();
```

## 📸 Screenshots and Reports

Tests automatically generate:
- 📸 **Screenshots**: Saved to `test-results/` for visual verification
- 📹 **Videos**: Recorded for failed tests
- 📊 **HTML Report**: Comprehensive results with timeline
- 📄 **JSON Report**: Machine-readable test results

### Viewing Results

```bash
# Open HTML report in browser
npm run test:report

# Check screenshot files
ls test-results/*.png

# View JSON results
cat test-results/results.json
```

## 🌐 Environment Configuration

### Required Environment Variables

```bash
# Test server URL (defaults to http://localhost:3008)
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3008

# Test user credentials (optional - uses mock auth if not provided)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=adminpassword123

# Cloudflare Workers (for integration testing)
SYNC_WORKER_URL=https://sync-worker.your-domain.workers.dev
WEBHOOK_HANDLER_URL=https://webhook-handler.your-domain.workers.dev
SYNC_COORDINATOR_URL=https://sync-coordinator.your-domain.workers.dev
```

### Prerequisites

1. **Development Server**: Must be running on configured port
   ```bash
   npm run dev  # Should be accessible at http://localhost:3008
   ```

2. **Database**: Supabase or local database should be available
3. **Environment Variables**: Set in `.env.local` for the main application

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:install
      - run: npm run build
      - run: npm run dev &
      - run: npm test
        env:
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3008
```

## 🔍 Debugging Tests

### Common Issues and Solutions

1. **Authentication Failures**
   ```bash
   # Re-create authentication state
   rm -rf tests/.auth/*
   npm run test:setup
   ```

2. **Server Not Available**
   ```bash
   # Ensure dev server is running
   npm run dev
   # Check if accessible
   curl http://localhost:3008
   ```

3. **Test Timeouts**
   ```bash
   # Run with increased timeout
   npx playwright test --timeout=60000
   ```

4. **Mobile Test Failures**
   ```bash
   # Install mobile browser engines
   npx playwright install
   ```

### Debug Mode

```bash
# Step through tests interactively
npm run test:debug

# Run specific test with debug
npx playwright test --debug tests/e2e/complete-sync-flow.spec.ts
```

## 📈 Performance Benchmarks

The test suite validates performance metrics:

- ✅ **Page Load Time**: < 3 seconds
- ✅ **API Response Time**: < 5 seconds
- ✅ **First Contentful Paint**: < 2 seconds
- ✅ **Touch Target Size**: ≥ 44px (iOS guidelines)
- ✅ **Mobile Load Time**: < 5 seconds (simulated slow connection)

## 🎯 Success Criteria

All tests passing indicates:

- ✅ **Authentication**: OAuth and login flows working
- ✅ **Core Functionality**: Sync operations successful
- ✅ **API Integration**: All endpoints responding correctly
- ✅ **Mobile Compatibility**: Responsive design working
- ✅ **Performance**: Meeting performance benchmarks
- ✅ **Error Handling**: Graceful degradation functional
- ✅ **Cross-Browser**: Compatible across browsers
- ✅ **Real-time**: Live updates functioning

## 🔧 Extending Tests

### Adding New Test Files

1. Create test file in appropriate directory (`e2e/`, `api/`)
2. Use authentication fixture: `test.use({ storageState: 'tests/.auth/user.json' })`
3. Import helpers: `import { test, expect, DashboardHelpers } from '../fixtures/test-helpers';`
4. Add test to appropriate project in `playwright.config.ts`

### Adding New Test Projects

```typescript
// In playwright.config.ts
{
  name: 'new-project',
  use: { 
    ...devices['Desktop Chrome'],
    storageState: 'tests/.auth/user.json',
  },
  dependencies: ['setup'],
}
```

### Custom Assertions

```typescript
// Add to test-helpers.ts
export async function expectMetricValue(page: Page, metric: string, expectedMin: number) {
  const value = await page.locator(`[data-testid="${metric}"] .metric-value`).textContent();
  const numericValue = parseInt(value?.replace(/[^\d]/g, '') || '0');
  expect(numericValue).toBeGreaterThanOrEqual(expectedMin);
}
```

This comprehensive testing suite ensures the Keap-Supabase sync system is thoroughly validated across all functionality, platforms, and use cases.