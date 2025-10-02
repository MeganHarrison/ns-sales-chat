/**
 * Keap Sync API Client
 * 
 * Provides client-side interface for interacting with the sync system,
 * including manual sync triggers, status monitoring, and conflict resolution.
 */

export interface SyncStatistics {
  total_contacts: number
  total_orders: number
  total_tags: number
  total_subscriptions: number
  last_sync_time: string | null
  pending_conflicts: number
  total_sync_operations: number
  successful_syncs: number
  failed_syncs: number
}

export interface SyncHealthMetrics {
  total_entities: number
  successful_syncs: number
  failed_syncs: number
  pending_conflicts: number
  health_score: number
  last_updated: string
}

export interface SyncActivity {
  entity_type: string
  entity_id: string
  keap_id: string
  last_synced_at: string
  sync_direction: string
  conflict_status: string
  last_error: string | null
}

export interface SyncConflict {
  id: string
  entity_type: string
  entity_id: string
  keap_data: any
  supabase_data: any
  conflict_fields: string[]
  resolution_strategy: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export interface ManualSyncRequest {
  keapAccountId: string
  syncType?: 'contacts' | 'orders' | 'tags' | 'subscriptions' | 'all'
}

export interface ManualSyncResponse {
  success: boolean
  message: string
  syncType?: string
  error?: string
}

class KeapSyncClient {
  private syncWorkerUrl: string
  private syncCoordinatorUrl: string

  constructor() {
    // These will be configured via environment variables
    this.syncWorkerUrl = process.env.NEXT_PUBLIC_SYNC_WORKER_URL || 'https://sync-worker.your-domain.workers.dev'
    this.syncCoordinatorUrl = process.env.NEXT_PUBLIC_SYNC_COORDINATOR_URL || 'https://sync-coordinator.your-domain.workers.dev'
  }

  /**
   * Trigger a manual sync operation
   */
  async triggerManualSync(request: ManualSyncRequest): Promise<ManualSyncResponse> {
    try {
      const response = await fetch(`${this.syncWorkerUrl}/sync/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`Sync trigger failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Manual sync trigger error:', error)
      throw error
    }
  }

  /**
   * Get sync statistics for dashboard
   */
  async getSyncStatistics(): Promise<SyncStatistics> {
    try {
      const response = await fetch(`${this.syncWorkerUrl}/sync/stats`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get sync statistics: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Get sync statistics error:', error)
      throw error
    }
  }

  /**
   * Get sync health metrics
   */
  async getSyncHealthMetrics(): Promise<SyncHealthMetrics> {
    try {
      const response = await fetch(`${this.syncWorkerUrl}/sync/stats`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get health metrics: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Calculate health metrics from statistics
      return {
        total_entities: data.total_sync_operations || 0,
        successful_syncs: data.successful_syncs || 0,
        failed_syncs: data.failed_syncs || 0,
        pending_conflicts: data.pending_conflicts || 0,
        health_score: data.total_sync_operations > 0 ? 
          ((data.successful_syncs / data.total_sync_operations) * 100) : 100,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Get health metrics error:', error)
      throw error
    }
  }

  /**
   * Get recent sync activities
   */
  async getRecentSyncActivities(limit: number = 50): Promise<SyncActivity[]> {
    try {
      const response = await fetch(`${this.syncWorkerUrl}/sync/status`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get sync activities: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.syncStatus || []
    } catch (error) {
      console.error('Get sync activities error:', error)
      throw error
    }
  }

  /**
   * Initiate OAuth flow for Keap account
   */
  async initiateOAuth(keapAccountId: string): Promise<{ auth_url: string }> {
    try {
      const response = await fetch(`${this.syncCoordinatorUrl}/keap/${keapAccountId}/oauth/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keapAccountId })
      })

      if (!response.ok) {
        throw new Error(`OAuth initiation failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('OAuth initiation error:', error)
      throw error
    }
  }

  /**
   * Get sync status for a specific account
   */
  async getAccountSyncStatus(keapAccountId: string): Promise<any> {
    try {
      const response = await fetch(`${this.syncCoordinatorUrl}/keap/${keapAccountId}/sync/status`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get account sync status: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Get account sync status error:', error)
      throw error
    }
  }

  /**
   * Get list of configured accounts
   */
  async getConfiguredAccounts(): Promise<Array<{
    keapAccountId: string
    config: any
    lastModified: string | null
  }>> {
    try {
      const response = await fetch(`${this.syncCoordinatorUrl}/accounts/list`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get configured accounts: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.accounts || []
    } catch (error) {
      console.error('Get configured accounts error:', error)
      throw error
    }
  }

  /**
   * Health check for sync services
   */
  async healthCheck(): Promise<{
    syncWorker: boolean
    syncCoordinator: boolean
    errors: string[]
  }> {
    const results = {
      syncWorker: false,
      syncCoordinator: false,
      errors: [] as string[]
    }

    // Check sync worker health
    try {
      const response = await fetch(`${this.syncWorkerUrl}/health`)
      if (response.ok) {
        results.syncWorker = true
      } else {
        results.errors.push(`Sync worker unhealthy: ${response.status}`)
      }
    } catch (error) {
      results.errors.push(`Sync worker unreachable: ${error.message}`)
    }

    // Check sync coordinator health
    try {
      const response = await fetch(`${this.syncCoordinatorUrl}/health`)
      if (response.ok) {
        results.syncCoordinator = true
      } else {
        results.errors.push(`Sync coordinator unhealthy: ${response.status}`)
      }
    } catch (error) {
      results.errors.push(`Sync coordinator unreachable: ${error.message}`)
    }

    return results
  }
}

// Export singleton instance
export const keapSyncClient = new KeapSyncClient()

// Export utility functions
export const formatSyncStatus = (status: string): string => {
  switch (status) {
    case 'none':
      return 'No conflicts'
    case 'pending':
      return 'Conflict pending'
    case 'resolved':
      return 'Conflict resolved'
    default:
      return status
  }
}

export const formatSyncDirection = (direction: string): string => {
  switch (direction) {
    case 'keap_to_supabase':
      return 'Keap → Supabase'
    case 'supabase_to_keap':
      return 'Supabase → Keap'
    case 'bidirectional':
      return 'Bidirectional'
    default:
      return direction
  }
}

export const getEntityTypeDisplayName = (entityType: string): string => {
  switch (entityType) {
    case 'contact':
      return 'Contacts'
    case 'order':
      return 'Orders'
    case 'tag':
      return 'Tags'
    case 'subscription':
      return 'Subscriptions'
    default:
      return entityType
  }
}

export const getHealthScoreColor = (score: number): string => {
  if (score >= 95) return 'text-green-600'
  if (score >= 80) return 'text-yellow-600'
  return 'text-red-600'
}

export const getHealthScoreStatus = (score: number): string => {
  if (score >= 95) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Poor'
}