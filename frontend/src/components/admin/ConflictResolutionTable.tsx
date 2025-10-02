'use client'

import React, { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, User, Package, Tag, AlertTriangle, ArrowRight } from 'lucide-react'
import { keapSyncClient, getEntityTypeDisplayName } from '@/lib/keap-sync'
import { formatDistanceToNow } from 'date-fns'

interface SyncConflict {
  id: string
  entity_type: 'contacts' | 'orders' | 'tags' | 'subscriptions'
  entity_id: string
  conflict_fields: string[]
  keap_data: Record<string, any>
  supabase_data: Record<string, any>
  created_at: string
  resolved_at?: string
  resolution_strategy?: string
  resolved_by?: string
}

interface ConflictResolutionTableProps {
  status: 'pending' | 'in_review' | 'resolved'
  limit?: number
}

export function ConflictResolutionTable({ status, limit = 20 }: ConflictResolutionTableProps) {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null)
  const [resolutionLoading, setResolutionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadConflicts()
  }, [status, limit])

  const loadConflicts = async () => {
    try {
      setLoading(true)
      const result = await keapSyncClient.getConflicts({ status, limit })
      setConflicts(result.conflicts || [])
    } catch (error) {
      console.error('Failed to load conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveConflict = async (conflictId: string, strategy: 'keap_wins' | 'supabase_wins' | 'merge') => {
    try {
      setResolutionLoading(conflictId)
      const result = await keapSyncClient.resolveConflict(conflictId, strategy)
      
      if (result.success) {
        // Remove from current list or refresh
        await loadConflicts()
        setSelectedConflict(null)
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setResolutionLoading(null)
    }
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'contacts':
        return <User className="h-4 w-4" />
      case 'orders':
        return <Package className="h-4 w-4" />
      case 'tags':
        return <Tag className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getStatusBadge = (conflict: SyncConflict) => {
    if (conflict.resolved_at) {
      return <Badge variant="default">Resolved</Badge>
    }
    if (status === 'in_review') {
      return <Badge variant="secondary">In Review</Badge>
    }
    return <Badge variant="destructive">Pending</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (conflicts.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No conflicts found</h3>
        <p className="text-muted-foreground">
          {status === 'pending' 
            ? "All systems are in sync! No conflicts require resolution."
            : status === 'in_review'
            ? "No conflicts are currently under review."
            : "No conflicts have been resolved recently."
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entity</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Conflicted Fields</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conflicts.map((conflict) => (
            <TableRow key={conflict.id}>
              <TableCell className="flex items-center space-x-2">
                {getEntityIcon(conflict.entity_type)}
                <span className="font-mono text-sm">{conflict.entity_id}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getEntityTypeDisplayName(conflict.entity_type)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {conflict.conflict_fields.slice(0, 3).map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                  {conflict.conflict_fields.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{conflict.conflict_fields.length - 3} more
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(conflict.created_at), { addSuffix: true })}</span>
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(conflict)}
              </TableCell>
              <TableCell className="text-right">
                {!conflict.resolved_at && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedConflict(conflict)}
                      >
                        Resolve
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          {getEntityIcon(conflict.entity_type)}
                          <span>Resolve Conflict: {getEntityTypeDisplayName(conflict.entity_type)}</span>
                        </DialogTitle>
                        <DialogDescription>
                          ID: {conflict.entity_id} • {conflict.conflict_fields.length} conflicted fields
                        </DialogDescription>
                      </DialogHeader>
                      
                      {selectedConflict && (
                        <ConflictResolutionDialog 
                          conflict={selectedConflict}
                          onResolve={resolveConflict}
                          loading={resolutionLoading === selectedConflict.id}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                )}
                {conflict.resolved_at && (
                  <Badge variant="outline" className="text-xs">
                    {conflict.resolution_strategy?.replace('_', ' ')}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ConflictResolutionDialog({ 
  conflict, 
  onResolve, 
  loading 
}: { 
  conflict: SyncConflict
  onResolve: (id: string, strategy: 'keap_wins' | 'supabase_wins' | 'merge') => void
  loading: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Field-by-field comparison */}
      <div className="space-y-4">
        {conflict.conflict_fields.map((field) => (
          <Card key={field}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Field: {field}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-blue-600 mb-2">Keap Value</h4>
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="text-sm">
                      {JSON.stringify(conflict.keap_data[field], null, 2)}
                    </code>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-green-600 mb-2">Supabase Value</h4>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="text-sm">
                      {JSON.stringify(conflict.supabase_data[field], null, 2)}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Resolution options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Resolution Strategy</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-blue-500 transition-colors">
            <CardContent className="p-4">
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => onResolve(conflict.id, 'keap_wins')}
                disabled={loading}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Use Keap Data
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Keap data will overwrite Supabase
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-green-500 transition-colors">
            <CardContent className="p-4">
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => onResolve(conflict.id, 'supabase_wins')}
                disabled={loading}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Use Supabase Data
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Supabase data will overwrite Keap
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-purple-500 transition-colors">
            <CardContent className="p-4">
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => onResolve(conflict.id, 'merge')}
                disabled={loading}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Smart Merge
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Intelligent field-by-field merge
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}