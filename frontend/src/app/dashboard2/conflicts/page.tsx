import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConflictResolutionTable } from '@/components/admin/ConflictResolutionTable'
import { ConflictFilters } from '@/components/admin/ConflictFilters'
import { ConflictStatistics } from '@/components/admin/ConflictStatistics'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ConflictsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Sync Conflicts</h1>
            <p className="text-muted-foreground">
              Review and resolve synchronization conflicts between Keap and Supabase
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
        <ConflictStatistics />
      </Suspense>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Average: 2h review time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              +33% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              76% of total conflicts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Conflict Resolution Interface */}
      <Tabs defaultValue="pending" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">Pending Resolution</TabsTrigger>
            <TabsTrigger value="in-review">In Review</TabsTrigger>
            <TabsTrigger value="resolved">Recently Resolved</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <ConflictFilters />
            <Button variant="outline" size="sm">
              Export Report
            </Button>
          </div>
        </div>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span>Conflicts Requiring Resolution</span>
                <Badge variant="secondary">12 pending</Badge>
              </CardTitle>
              <CardDescription>
                These conflicts require manual review and decision-making to resolve differences between systems.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <ConflictResolutionTable status="pending" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Under Review</span>
                <Badge variant="secondary">3 in review</Badge>
              </CardTitle>
              <CardDescription>
                Conflicts currently being processed or awaiting final confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <ConflictResolutionTable status="in_review" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Recently Resolved</span>
                <Badge variant="secondary">32 this week</Badge>
              </CardTitle>
              <CardDescription>
                Successfully resolved conflicts from the past 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <ConflictResolutionTable status="resolved" limit={50} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}