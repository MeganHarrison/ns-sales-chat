'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { keapSyncClient } from '@/lib/keap-sync'

interface ConflictStats {
  total_conflicts: number
  pending_conflicts: number
  resolved_today: number
  auto_resolved_rate: number
  avg_resolution_time_hours: number
  trends: {
    pending_change: number
    resolution_rate_change: number
  }
  by_entity_type: {
    contacts: number
    orders: number
    tags: number
    subscriptions: number
  }
  by_field: {
    [field: string]: number
  }
}

export function ConflictStatistics() {
  const [stats, setStats] = useState<ConflictStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      // This would call the actual API endpoint
      // const result = await keapSyncClient.getConflictStatistics()
      
      // Mock data for now
      const mockStats: ConflictStats = {
        total_conflicts: 147,
        pending_conflicts: 12,
        resolved_today: 8,
        auto_resolved_rate: 76,
        avg_resolution_time_hours: 2.3,
        trends: {
          pending_change: -15,
          resolution_rate_change: 8
        },
        by_entity_type: {
          contacts: 8,
          orders: 3,
          tags: 1,
          subscriptions: 0
        },
        by_field: {
          email: 4,
          first_name: 2,
          last_name: 2,
          phone: 1,
          tags: 2,
          custom_fields: 1
        }
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load conflict statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-6 w-16 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Failed to load statistics</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.auto_resolved_rate}%</div>
            <div className="flex items-center mt-1">
              {getTrendIcon(stats.trends.resolution_rate_change)}
              <span className={`text-sm ml-1 ${getTrendColor(stats.trends.resolution_rate_change)}`}>
                {Math.abs(stats.trends.resolution_rate_change)}% from last week
              </span>
            </div>
            <Progress value={stats.auto_resolved_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_resolution_time_hours}h</div>
            <div className="flex items-center mt-1">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-sm ml-1 text-green-600">
                12% faster than last week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_conflicts}</div>
            <div className="text-sm text-muted-foreground mt-1">
              All time count
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_conflicts}</div>
            <div className="flex items-center mt-1">
              {getTrendIcon(stats.trends.pending_change)}
              <span className={`text-sm ml-1 ${getTrendColor(stats.trends.pending_change)}`}>
                {Math.abs(stats.trends.pending_change)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conflicts by Entity Type</CardTitle>
            <CardDescription>Current pending conflicts breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.by_entity_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize">{type}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(stats.by_entity_type))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Conflicted Fields</CardTitle>
            <CardDescription>Fields with frequent conflicts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.by_field)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([field, count]) => (
                <div key={field} className="flex items-center justify-between">
                  <span className="font-mono text-sm">{field}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-destructive rounded-full h-2 transition-all"
                        style={{ 
                          width: `${(count / Math.max(...Object.values(stats.by_field))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}