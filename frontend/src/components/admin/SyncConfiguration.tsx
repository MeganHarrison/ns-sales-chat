'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Pause, RotateCcw, Save, AlertTriangle } from 'lucide-react'
import { keapSyncClient } from '@/lib/keap-sync'

interface SyncConfig {
  sync_enabled: boolean
  sync_interval_minutes: number
  batch_size: number
  max_retries: number
  entities: {
    contacts: {
      enabled: boolean
      sync_direction: 'bidirectional' | 'keap_to_supabase' | 'supabase_to_keap'
      field_mapping: Record<string, string>
    }
    orders: {
      enabled: boolean
      sync_direction: 'bidirectional' | 'keap_to_supabase' | 'supabase_to_keap'
      field_mapping: Record<string, string>
    }
    tags: {
      enabled: boolean
      sync_direction: 'bidirectional' | 'keap_to_supabase' | 'supabase_to_keap'
    }
    subscriptions: {
      enabled: boolean
      sync_direction: 'bidirectional' | 'keap_to_supabase' | 'supabase_to_keap'
    }
  }
  conflict_resolution: {
    auto_resolve: boolean
    default_strategy: 'keap_wins' | 'supabase_wins' | 'merge'
    notify_on_conflict: boolean
  }
  rate_limiting: {
    requests_per_minute: number
    burst_limit: number
  }
}

export function SyncConfiguration() {
  const [config, setConfig] = useState<SyncConfig>({
    sync_enabled: true,
    sync_interval_minutes: 15,
    batch_size: 100,
    max_retries: 3,
    entities: {
      contacts: {
        enabled: true,
        sync_direction: 'bidirectional',
        field_mapping: {
          'email': 'email',
          'first_name': 'first_name',
          'last_name': 'last_name',
          'phone': 'phone_number'
        }
      },
      orders: {
        enabled: true,
        sync_direction: 'bidirectional',
        field_mapping: {
          'id': 'keap_order_id',
          'total': 'total_amount',
          'status': 'order_status'
        }
      },
      tags: {
        enabled: true,
        sync_direction: 'bidirectional'
      },
      subscriptions: {
        enabled: false,
        sync_direction: 'keap_to_supabase'
      }
    },
    conflict_resolution: {
      auto_resolve: false,
      default_strategy: 'merge',
      notify_on_conflict: true
    },
    rate_limiting: {
      requests_per_minute: 1400,
      burst_limit: 50
    }
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      // In real implementation, load from API
      // const result = await keapSyncClient.getSyncConfiguration()
      // setConfig(result.config)
      setLastSync(new Date(Date.now() - 900000)) // 15 minutes ago
    } catch (error) {
      console.error('Failed to load configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    try {
      setSaving(true)
      // In real implementation, save to API
      // await keapSyncClient.updateSyncConfiguration(config)
      console.log('Configuration saved:', config)
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  const triggerManualSync = async () => {
    try {
      await keapSyncClient.triggerManualSync({
        keapAccountId: 'default-account',
        syncType: 'all'
      })
      setLastSync(new Date())
    } catch (error) {
      console.error('Failed to trigger sync:', error)
    }
  }

  if (loading) {
    return <div className="space-y-6">Loading configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Sync Status and Controls */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${config.sync_enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
          <div>
            <p className="font-medium">
              Sync Status: {config.sync_enabled ? 'Active' : 'Paused'}
            </p>
            <p className="text-sm text-muted-foreground">
              {lastSync ? `Last sync: ${lastSync.toLocaleString()}` : 'Never synced'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerManualSync}
            className="flex items-center space-x-1"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Sync Now</span>
          </Button>
          <Button
            variant={config.sync_enabled ? "destructive" : "default"}
            size="sm"
            onClick={() => setConfig({...config, sync_enabled: !config.sync_enabled})}
            className="flex items-center space-x-1"
          >
            {config.sync_enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{config.sync_enabled ? 'Pause' : 'Resume'}</span>
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic synchronization parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
              <Input
                id="sync-interval"
                type="number"
                value={config.sync_interval_minutes}
                onChange={(e) => setConfig({
                  ...config,
                  sync_interval_minutes: parseInt(e.target.value) || 15
                })}
                min={5}
                max={1440}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                value={config.batch_size}
                onChange={(e) => setConfig({
                  ...config,
                  batch_size: parseInt(e.target.value) || 100
                })}
                min={10}
                max={1000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-retries">Max Retries</Label>
              <Input
                id="max-retries"
                type="number"
                value={config.max_retries}
                onChange={(e) => setConfig({
                  ...config,
                  max_retries: parseInt(e.target.value) || 3
                })}
                min={0}
                max={10}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Synchronization</CardTitle>
          <CardDescription>Configure which entities to sync and their direction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(config.entities).map(([entityType, entityConfig]) => (
            <div key={entityType} className="border border-[#f2f2f2] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={entityConfig.enabled}
                    onCheckedChange={(enabled) => setConfig({
                      ...config,
                      entities: {
                        ...config.entities,
                        [entityType]: { ...entityConfig, enabled }
                      }
                    })}
                  />
                  <div>
                    <h3 className="font-medium capitalize">{entityType}</h3>
                    <p className="text-sm text-muted-foreground">
                      {entityConfig.enabled ? 'Sync enabled' : 'Sync disabled'}
                    </p>
                  </div>
                </div>
                <Badge variant={entityConfig.enabled ? "default" : "secondary"}>
                  {entityConfig.sync_direction.replace(/_/g, ' ')}
                </Badge>
              </div>

              {entityConfig.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sync Direction</Label>
                    <Select
                      value={entityConfig.sync_direction}
                      onValueChange={(direction: any) => setConfig({
                        ...config,
                        entities: {
                          ...config.entities,
                          [entityType]: { ...entityConfig, sync_direction: direction }
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bidirectional">Bidirectional</SelectItem>
                        <SelectItem value="keap_to_supabase">Keap → Supabase</SelectItem>
                        <SelectItem value="supabase_to_keap">Supabase → Keap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {entityConfig.field_mapping && (
                    <div className="space-y-2">
                      <Label>Field Mapping</Label>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">Keap Field</div>
                        <div className="font-medium">Supabase Field</div>
                        {Object.entries(entityConfig.field_mapping).map(([keapField, supabaseField]) => (
                          <React.Fragment key={keapField}>
                            <div className="font-mono bg-muted px-2 py-1 rounded">{keapField}</div>
                            <div className="font-mono bg-muted px-2 py-1 rounded">{supabaseField}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Conflict Resolution */}
      <Card>
        <CardHeader>
          <CardTitle>Conflict Resolution</CardTitle>
          <CardDescription>Configure how conflicts are handled automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.conflict_resolution.auto_resolve}
              onCheckedChange={(auto_resolve) => setConfig({
                ...config,
                conflict_resolution: { ...config.conflict_resolution, auto_resolve }
              })}
            />
            <Label>Enable automatic conflict resolution</Label>
          </div>

          {config.conflict_resolution.auto_resolve && (
            <div className="space-y-4 pl-6 border-l-2 border-[#f2f2f2]">
              <div className="space-y-2">
                <Label>Default Resolution Strategy</Label>
                <Select
                  value={config.conflict_resolution.default_strategy}
                  onValueChange={(strategy: any) => setConfig({
                    ...config,
                    conflict_resolution: { ...config.conflict_resolution, default_strategy: strategy }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keap_wins">Keap Data Wins</SelectItem>
                    <SelectItem value="supabase_wins">Supabase Data Wins</SelectItem>
                    <SelectItem value="merge">Smart Merge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.conflict_resolution.notify_on_conflict}
                  onCheckedChange={(notify_on_conflict) => setConfig({
                    ...config,
                    conflict_resolution: { ...config.conflict_resolution, notify_on_conflict }
                  })}
                />
                <Label>Send notifications on conflicts</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>
            Control API request rates to respect Keap's limits (1500 requests/minute max)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requests-per-minute">Requests per Minute</Label>
              <Input
                id="requests-per-minute"
                type="number"
                value={config.rate_limiting.requests_per_minute}
                onChange={(e) => setConfig({
                  ...config,
                  rate_limiting: {
                    ...config.rate_limiting,
                    requests_per_minute: parseInt(e.target.value) || 1400
                  }
                })}
                min={100}
                max={1500}
              />
              <p className="text-xs text-muted-foreground">
                Keep below 1500 to avoid rate limiting
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="burst-limit">Burst Limit</Label>
              <Input
                id="burst-limit"
                type="number"
                value={config.rate_limiting.burst_limit}
                onChange={(e) => setConfig({
                  ...config,
                  rate_limiting: {
                    ...config.rate_limiting,
                    burst_limit: parseInt(e.target.value) || 50
                  }
                })}
                min={10}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Max requests in a single burst
              </p>
            </div>
          </div>

          {config.rate_limiting.requests_per_minute > 1450 && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Warning: Rate limit is close to Keap's maximum. Consider lowering to avoid throttling.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfiguration} disabled={saving} className="flex items-center space-x-2">
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </Button>
      </div>
    </div>
  )
}