'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Direct client creation with hardcoded values for testing
const supabase = createClient(
  'https://ulyrnuemxucoglbcwzig.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseXJudWVteHVjb2dsYmN3emlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzYwMzQsImV4cCI6MjA2Njk1MjAzNH0.CIy7AAbNmP2tiEvBAlo4y8XFVQ3M_0kV2hulbp6G4Hc'
)

export default function TestIntercomPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      console.log('Starting fetch...')
      const { data, error } = await supabase
        .from('intercom_conversations')
        .select('*')
        .limit(10)

      console.log('Fetch result:', { data, error })

      if (error) {
        setError(error.message)
        console.error('Supabase error:', error)
      } else {
        setConversations(data || [])
      }
    } catch (err) {
      console.error('Catch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Intercom Data</h1>

      {loading && <p>Loading...</p>}

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div>
          <p className="mb-4">Found {conversations.length} conversations</p>

          <div className="space-y-4">
            {conversations.map((conv) => (
              <div key={conv.conversation_id} className="bg-gray-100 p-4 rounded">
                <p><strong>ID:</strong> {conv.conversation_id}</p>
                <p><strong>State:</strong> {conv.state}</p>
                <p><strong>Priority:</strong> {conv.priority}</p>
                <p><strong>Created:</strong> {new Date(conv.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}