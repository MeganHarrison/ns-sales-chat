'use client'

import { useState, useEffect } from 'react'
import { Shield, Mail, User, Briefcase, Calendar, RefreshCw, Download, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatValue } from '@/lib/formatters'

interface IntercomAdmin {
  admin_id: string
  type: string
  name: string
  email: string
  job_title?: string
  away_mode_enabled?: boolean
  away_mode_reassign?: boolean
  has_inbox_seat?: boolean
  avatar?: {
    type?: string
    image_url?: string
  }
  team_ids?: string[]
  created_at: string
  updated_at: string
  synced_at: string
}

const ADMIN_TYPE_COLORS = {
  admin: 'bg-purple-100 text-purple-800',
  teammate: 'bg-blue-100 text-blue-800',
  bot: 'bg-gray-100 text-gray-800'
}

export default function IntercomAdminsPage() {
  const [admins, setAdmins] = useState<IntercomAdmin[]>([])
  const [filteredAdmins, setFilteredAdmins] = useState<IntercomAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedAdmins, setSelectedAdmins] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchAdmins()
  }, [])

  useEffect(() => {
    filterAndSortAdmins()
  }, [admins, searchTerm, typeFilter, statusFilter, sortBy, sortOrder])

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('intercom_admins')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      setAdmins(data || [])
    } catch (error) {
      console.error('Error fetching admins:', error)
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortAdmins = () => {
    let filtered = [...admins]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(admin =>
        admin.admin_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(admin => admin.type === typeFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'away':
          filtered = filtered.filter(admin => admin.away_mode_enabled)
          break
        case 'available':
          filtered = filtered.filter(admin => !admin.away_mode_enabled)
          break
        case 'has_inbox_seat':
          filtered = filtered.filter(admin => admin.has_inbox_seat)
          break
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'name':
          compareValue = (a.name || '').localeCompare(b.name || '')
          break
        case 'created_at':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'updated_at':
          compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
      }

      return sortOrder === 'asc' ? compareValue : -compareValue
    })

    setFilteredAdmins(filtered)
  }

  const toggleAdminSelection = (adminId: string) => {
    const newSelection = new Set(selectedAdmins)
    if (newSelection.has(adminId)) {
      newSelection.delete(adminId)
    } else {
      newSelection.add(adminId)
    }
    setSelectedAdmins(newSelection)
  }

  const selectAll = () => {
    setSelectedAdmins(new Set(filteredAdmins.map(admin => admin.admin_id)))
  }

  const clearSelection = () => {
    setSelectedAdmins(new Set())
  }

  const exportAdmins = () => {
    const dataToExport = selectedAdmins.size > 0
      ? filteredAdmins.filter(admin => selectedAdmins.has(admin.admin_id))
      : filteredAdmins

    const csv = [
      ['Admin ID', 'Type', 'Name', 'Email', 'Job Title', 'Away Mode', 'Has Inbox Seat', 'Created'],
      ...dataToExport.map(admin => [
        admin.admin_id,
        admin.type || '',
        admin.name || '',
        admin.email || '',
        admin.job_title || '',
        admin.away_mode_enabled ? 'Yes' : 'No',
        admin.has_inbox_seat ? 'Yes' : 'No',
        formatValue(admin.created_at, 'dateTime')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `intercom-admins-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const refreshData = async () => {
    setSyncing(true)
    try {
      await fetchAdmins()
    } finally {
      setSyncing(false)
    }
  }

  // Get unique types for filter
  const uniqueTypes = [...new Set(admins.map(admin => admin.type).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-600" />
              Intercom Team Members
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredAdmins.length} team members found
              {selectedAdmins.size > 0 && ` • ${selectedAdmins.size} selected`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={refreshData}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={exportAdmins}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="away">Away</option>
            <option value="has_inbox_seat">Has Inbox Seat</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="created_at">Sort by Created</option>
            <option value="updated_at">Sort by Updated</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedAdmins.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedAdmins.size} team member{selectedAdmins.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear selection
            </button>
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select all
            </button>
          </div>
        )}
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdmins.map((admin) => (
          <div
            key={admin.admin_id}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
              selectedAdmins.has(admin.admin_id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {admin.avatar?.image_url ? (
                    <img
                      src={admin.avatar.image_url}
                      alt={admin.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-purple-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{admin.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      ADMIN_TYPE_COLORS[admin.type as keyof typeof ADMIN_TYPE_COLORS] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {admin.type}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedAdmins.has(admin.admin_id)}
                  onChange={() => toggleAdminSelection(admin.admin_id)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{admin.email}</span>
                </div>
                {admin.job_title && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{admin.job_title}</span>
                  </div>
                )}
              </div>

              {/* Status Indicators */}
              <div className="flex flex-wrap gap-2 mb-4">
                {admin.away_mode_enabled ? (
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                    Away Mode
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    Available
                  </span>
                )}
                {admin.has_inbox_seat && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    Inbox Seat
                  </span>
                )}
                {admin.away_mode_reassign && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                    Auto-reassign
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined: {formatValue(admin.created_at, 'date')}
                </div>
                <button
                  onClick={() => setShowDetails(showDetails === admin.admin_id ? null : admin.admin_id)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {showDetails === admin.admin_id ? 'Hide' : 'Details'}
                </button>
              </div>

              {/* Expanded Details */}
              {showDetails === admin.admin_id && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-2">
                  <div><strong>Admin ID:</strong> {admin.admin_id}</div>
                  <div><strong>Type:</strong> {admin.type}</div>
                  <div><strong>Created:</strong> {formatValue(admin.created_at, 'dateTime')}</div>
                  <div><strong>Updated:</strong> {formatValue(admin.updated_at, 'dateTime')}</div>
                  <div><strong>Synced:</strong> {formatValue(admin.synced_at, 'dateTime')}</div>
                  {admin.team_ids && admin.team_ids.length > 0 && (
                    <div><strong>Teams:</strong> {admin.team_ids.length} team{admin.team_ids.length !== 1 ? 's' : ''}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAdmins.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'No team members have been synced yet'}
          </p>
        </div>
      )}

      {/* Stats Summary */}
      {filteredAdmins.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredAdmins.length}</div>
              <div className="text-gray-600">Total Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredAdmins.filter(admin => !admin.away_mode_enabled).length}
              </div>
              <div className="text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredAdmins.filter(admin => admin.away_mode_enabled).length}
              </div>
              <div className="text-gray-600">Away</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredAdmins.filter(admin => admin.has_inbox_seat).length}
              </div>
              <div className="text-gray-600">With Inbox</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}