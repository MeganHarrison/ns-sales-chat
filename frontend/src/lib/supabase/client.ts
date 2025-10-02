import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Browser client for client components
export function createClient() {
  // These values are injected at build time by Next.js
  const supabaseUrl = 'https://ulyrnuemxucoglbcwzig.supabase.co'
  // Using service role key temporarily to bypass RLS for read operations
  // NOTE: In production, you should set up proper RLS policies instead
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseXJudWVteHVjb2dsYmN3emlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM3NjAzNCwiZXhwIjoyMDY2OTUyMDM0fQ.U__Mkf6mYlai13mi8IVFVK4QArdwDo5WXXypSEpafW0'

  return createBrowserClient<Database>(supabaseUrl, supabaseServiceKey)
}

export type SupabaseClient = ReturnType<typeof createClient>