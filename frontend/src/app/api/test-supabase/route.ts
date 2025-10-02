import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use the environment variables directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase credentials',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      }, { status: 500 })
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test queries to each table
    const [conversations, messages, users, admins, tags] = await Promise.all([
      supabase.from('intercom_conversations').select('*').limit(5),
      supabase.from('intercom_messages').select('*').limit(5),
      supabase.from('intercom_users').select('*').limit(5),
      supabase.from('intercom_admins').select('*').limit(5),
      supabase.from('intercom_tags').select('*').limit(5)
    ])

    const result = {
      success: true,
      data: {
        conversations: {
          count: conversations.data?.length || 0,
          error: conversations.error,
          sample: conversations.data?.[0]
        },
        messages: {
          count: messages.data?.length || 0,
          error: messages.error,
          sample: messages.data?.[0]
        },
        users: {
          count: users.data?.length || 0,
          error: users.error,
          sample: users.data?.[0]
        },
        admins: {
          count: admins.data?.length || 0,
          error: admins.error,
          sample: admins.data?.[0]
        },
        tags: {
          count: tags.data?.length || 0,
          error: tags.error,
          sample: tags.data?.[0]
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to connect to Supabase',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}