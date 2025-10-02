import { getDashboardMetrics } from '@/lib/dashboard-queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export async function SyncStatusCard() {
  const metrics = await getDashboardMetrics()

  const statusCards = [
    {
      title: "Total Contacts",
      value: metrics.totalContacts.toLocaleString(),
      description: "Synced contacts",
      trend: "+12% from last month"
    },
    {
      title: "Total Orders",
      value: metrics.totalOrders.toLocaleString(),
      description: "Synced orders",
      trend: "+8% from last month"
    },
    {
      title: "Total Revenue",
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      description: "From synced orders",
      trend: `Avg: $${Math.round(metrics.avgOrderValue)}`
    },
    {
      title: "Sync Health",
      value: `${Math.round(metrics.syncHealth)}%`,
      description: "System reliability",
      trend: metrics.lastSyncTime 
        ? `Last sync: ${formatDistanceToNow(new Date(metrics.lastSyncTime), { addSuffix: true })}`
        : "No recent syncs"
    }
  ]

  return (
    <>
      {statusCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              {/* Icon placeholder */}
              <div className="h-full w-full bg-muted rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">
              {card.description}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {card.trend}
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}