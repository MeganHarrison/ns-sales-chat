'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface KpiChartsProps {
  entityType?: 'contacts' | 'orders' | 'tags' | 'subscriptions'
}

export function KpiCharts({ entityType }: KpiChartsProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadChartData() {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/trends?days=7')
        if (!response.ok) {
          throw new Error('Failed to fetch chart data')
        }
        const data = await response.json()
        setChartData(data)
      } catch (err) {
        console.error('Failed to load chart data:', err)
        setError('Failed to load chart data')
      } finally {
        setLoading(false)
      }
    }

    loadChartData()
  }, [entityType])

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading chart data...</div>
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

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No sync data available</div>
      </div>
    )
  }

  // Filter data by entity type if specified
  const filteredData = entityType 
    ? chartData.map(item => ({
        date: item.date,
        [entityType]: item[entityType] || 0
      }))
    : chartData

  const entityColors = {
    contact: '#8884d8',
    order: '#82ca9d',
    tag: '#ffc658',
    subscription: '#ff7300'
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        {entityType ? (
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Line 
              type="monotone" 
              dataKey={entityType} 
              stroke={entityColors[entityType]} 
              strokeWidth={2}
              dot={{ fill: entityColors[entityType], strokeWidth: 2 }}
            />
          </LineChart>
        ) : (
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Bar dataKey="contact" stackId="a" fill={entityColors.contact} />
            <Bar dataKey="order" stackId="a" fill={entityColors.order} />
            <Bar dataKey="tag" stackId="a" fill={entityColors.tag} />
            <Bar dataKey="subscription" stackId="a" fill={entityColors.subscription} />
          </BarChart>
        )}
      </ResponsiveContainer>
      
      {!entityType && (
        <div className="flex justify-center mt-4 space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-[#8884d8] rounded mr-2"></div>
            Contacts
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-[#82ca9d] rounded mr-2"></div>
            Orders
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-[#ffc658] rounded mr-2"></div>
            Tags
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-[#ff7300] rounded mr-2"></div>
            Subscriptions
          </div>
        </div>
      )}
    </div>
  )
}