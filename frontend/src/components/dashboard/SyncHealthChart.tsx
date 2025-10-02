'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

interface SyncHealthChartProps {
  detailed?: boolean
}

export function SyncHealthChart({ detailed = false }: SyncHealthChartProps) {
  const [healthData, setHealthData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHealthData() {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/health')
        if (!response.ok) {
          throw new Error('Failed to fetch health data')
        }
        const data = await response.json()
        setHealthData(data)
      } catch (err) {
        console.error('Failed to load health data:', err)
        setError('Failed to load health data')
      } finally {
        setLoading(false)
      }
    }

    loadHealthData()
  }, [])

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading health data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-red-500">{error}</div>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No health data available</div>
      </div>
    )
  }

  const healthScore = healthData.syncSuccessRate || 0
  const healthColor = healthScore >= 95 ? '#10b981' : healthScore >= 80 ? '#f59e0b' : '#ef4444'

  const pieData = [
    { name: 'Successful', value: healthScore, color: '#10b981' },
    { name: 'Failed', value: 100 - healthScore, color: '#ef4444' }
  ]

  if (detailed && healthData.entityBreakdown) {
    return (
      <div className="space-y-6">
        {/* Overall Health Score */}
        <div className="text-center">
          <div className="text-3xl font-bold mb-2" style={{ color: healthColor }}>
            {Math.round(healthScore)}%
          </div>
          <div className="text-sm text-muted-foreground">Sync Success Rate</div>
          <div className="text-xs text-muted-foreground mt-1">
            {healthData.totalEntities} total entities
          </div>
        </div>

        {/* Entity Breakdown Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={healthData.entityBreakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="entityType" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="synced" fill="#10b981" name="Synced" />
            <Bar dataKey="conflicts" fill="#ef4444" name="Conflicts" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="text-center mt-4">
        <div className="text-2xl font-bold mb-2" style={{ color: healthColor }}>
          {Math.round(healthScore)}%
        </div>
        <div className="text-sm text-muted-foreground">Overall Health Score</div>
        
        <div className="flex justify-center space-x-4 mt-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            Successful
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            Failed
          </div>
        </div>
        
        {healthData.pendingConflicts > 0 && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-sm text-yellow-800">
              ⚠️ {healthData.pendingConflicts} pending conflicts need resolution
            </div>
          </div>
        )}
      </div>
    </div>
  )
}