'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function QuickActions() {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleManualSync = async (syncType: 'all' | 'contacts' | 'orders' | 'tags' | 'subscriptions') => {
    try {
      setLoading(syncType)
      setMessage(null)
      
      const response = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keapAccountId: 'default-account',
          syncType
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setMessage({ type: 'success', text: result.message || `${syncType} sync triggered successfully` })
        // Refresh the page after a delay to show updated data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Sync failed' })
      }
    } catch (error) {
      console.error('Manual sync error:', error)
      setMessage({ type: 'error', text: 'Failed to trigger sync' })
    } finally {
      setLoading(null)
    }
  }

  const handleOAuthSetup = async () => {
    try {
      setLoading('oauth')
      
      const response = await fetch('/api/keap/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keapAccountId: 'default-account'
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.auth_url) {
        // Redirect to OAuth URL
        window.open(result.auth_url, '_blank')
        setMessage({ type: 'success', text: 'OAuth window opened. Please complete authorization.' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to initiate OAuth' })
      }
    } catch (error) {
      console.error('OAuth setup error:', error)
      setMessage({ type: 'error', text: 'Failed to initiate OAuth' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleManualSync('all')}
        disabled={loading === 'all'}
      >
        {loading === 'all' ? 'Syncing...' : 'Sync All'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleManualSync('contacts')}
        disabled={loading === 'contacts'}
      >
        {loading === 'contacts' ? 'Syncing...' : 'Sync Contacts'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleOAuthSetup}
        disabled={loading === 'oauth'}
      >
        {loading === 'oauth' ? 'Opening...' : 'Setup OAuth'}
      </Button>

      {message && (
        <div className={`ml-4 text-sm ${
          message.type === 'success' ? 'text-green-600' : 'text-red-600'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  )
}