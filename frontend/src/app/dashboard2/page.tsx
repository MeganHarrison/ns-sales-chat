import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SyncStatusCard } from '@/components/dashboard/SyncStatusCard'
import { KpiCharts } from '@/components/dashboard/KpiCharts'
import { RecentActivities } from '@/components/dashboard/RecentActivities'
import { SyncHealthChart } from '@/components/dashboard/SyncHealthChart'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { ConflictAlerts } from '@/components/dashboard/ConflictAlerts'

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Keap-Supabase Sync Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your bidirectional sync operations
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Alert Section for Conflicts */}
      <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-lg" />}>
        <ConflictAlerts />
      </Suspense>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sync Status Cards */}
        <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
          <SyncStatusCard />
        </Suspense>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="health">Sync Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Performance</CardTitle>
                <CardDescription>
                  Real-time sync metrics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                  <KpiCharts />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Health</CardTitle>
                <CardDescription>
                  System health and reliability metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                  <SyncHealthChart />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activities</CardTitle>
              <CardDescription>
                Latest synchronization operations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <RecentActivities />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Sync Status</CardTitle>
                <CardDescription>Contact synchronization metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                  <KpiCharts entityType="contacts" />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Tags</CardTitle>
                <CardDescription>Most frequently used contact tags</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tag cloud or chart will be implemented */}
                <div className="text-center py-8 text-muted-foreground">
                  Tag analytics coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Sync Status</CardTitle>
                <CardDescription>Order synchronization metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                  <KpiCharts entityType="orders" />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Revenue trends and insights</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Revenue charts will be implemented */}
                <div className="text-center py-8 text-muted-foreground">
                  Revenue analytics coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health Overview</CardTitle>
                <CardDescription>Overall sync system health metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                  <SyncHealthChart detailed={true} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>Individual service health checks</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Service status indicators will be implemented */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Sync Worker</span>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sync Coordinator</span>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Webhook Handler</span>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database</span>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Loading component for the dashboard
export function DashboardLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  )
}