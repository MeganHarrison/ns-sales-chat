import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Settings, Database, Shield, Clock, Webhook } from 'lucide-react'
import Link from 'next/link'
import { SyncConfiguration } from '@/components/admin/SyncConfiguration'
import { OAuthManagement } from '@/components/admin/OAuthManagement'
import { WebhookSettings } from '@/components/admin/WebhookSettings'
import { ConflictSettings } from '@/components/admin/ConflictSettings'
import { DatabaseSettings } from '@/components/admin/DatabaseSettings'

export default function SettingsPage() {
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
            <h1 className="text-3xl font-bold">Sync Settings</h1>
            <p className="text-muted-foreground">
              Configure synchronization behavior, authentication, and system preferences
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
            System Online
          </Badge>
        </div>
      </div>

      {/* Settings Navigation */}
      <Tabs defaultValue="sync" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sync" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Sync Config</span>
          </TabsTrigger>
          <TabsTrigger value="oauth" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>OAuth</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center space-x-2">
            <Webhook className="h-4 w-4" />
            <span>Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Conflicts</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Database</span>
          </TabsTrigger>
        </TabsList>

        {/* Sync Configuration */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Configuration</CardTitle>
              <CardDescription>
                Configure sync schedules, entity preferences, and data mapping rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <SyncConfiguration />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OAuth Management */}
        <TabsContent value="oauth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>OAuth Authentication</CardTitle>
              <CardDescription>
                Manage Keap API access tokens, refresh cycles, and authentication status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <OAuthManagement />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Configuration */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhook endpoints, security settings, and event subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <WebhookSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflict Resolution Settings */}
        <TabsContent value="conflicts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conflict Resolution Settings</CardTitle>
              <CardDescription>
                Configure automatic conflict resolution rules and escalation policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <ConflictSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Configuration */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>
                Monitor database connections, performance metrics, and maintenance settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <DatabaseSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}