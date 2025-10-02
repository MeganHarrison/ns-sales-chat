// Re-export types
export type { Database } from './supabase/types'

// Re-export client functions
export { createClient, type SupabaseClient } from './supabase/client'

// Re-export server functions (only use in server components)
export { createServerComponentClient } from './supabase/server'

// Re-export middleware functions (only use in middleware)
export { createMiddlewareClient } from './supabase/middleware'