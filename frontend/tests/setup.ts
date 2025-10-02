import { beforeAll, afterAll } from 'vitest'

// Mock environment variables for testing
beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  process.env.SYNC_WORKER_URL = 'https://test-worker.workers.dev'
  process.env.SYNC_WORKER_AUTH_TOKEN = 'test-token'
})

// Cleanup after tests
afterAll(() => {
  // Any cleanup needed
})