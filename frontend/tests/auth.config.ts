export const STORAGE_STATE = 'tests/.auth/user.json';

export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    storageState: 'tests/.auth/admin.json'
  },
  user: {
    email: process.env.TEST_USER_EMAIL || 'user@example.com',
    password: process.env.TEST_USER_PASSWORD || 'user123',
    role: 'user',
    storageState: 'tests/.auth/user.json'
  },
  viewer: {
    email: process.env.TEST_VIEWER_EMAIL || 'viewer@example.com',
    password: process.env.TEST_VIEWER_PASSWORD || 'viewer123',
    role: 'viewer',
    storageState: 'tests/.auth/viewer.json'
  }
};

export const API_ENDPOINTS = {
  keapOAuth: '/api/keap/oauth',
  syncTrigger: '/api/sync/trigger',
  dashboardMetrics: '/api/dashboard/metrics',
  dashboardHealth: '/api/dashboard/health',
  dashboardTrends: '/api/dashboard/trends',
  conflictResolution: '/api/conflicts/resolve'
};

export const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3008',
  timeout: 30000,
  retries: 2,
  workers: process.env.CI ? 1 : 2
};