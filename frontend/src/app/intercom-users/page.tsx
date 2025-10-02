'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, Phone, MapPin, Calendar, Activity, RefreshCw, Download, Search, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatValue } from '@/lib/formatters'

interface IntercomUser {
  user_id: string
  type: string
  external_id?: string
  email?: string
  phone?: string
  name?: string
  created_at: string
  updated_at: string
  last_seen_at?: string
  signed_up_at?: string
  last_contacted_at?: string
  last_email_opened_at?: string
  last_email_clicked_at?: string
  session_count?: number
  social_profiles?: any[]
  location_data?: {
    city_name?: string
    continent_code?: string
    country_code?: string
    country_name?: string
    latitude?: number
    longitude?: number
    postal_code?: string
    region_name?: string
    timezone?: string
  }
  custom_attributes?: any
  tags?: string[]
  avatar?: {
    type?: string
    image_url?: string
  }
  companies?: any[]
  segments?: any[]
  unsubscribed_from_emails?: boolean
  marked_email_as_spam?: boolean
  has_hard_bounced?: boolean
  synced_at: string
}

const USER_TYPE_COLORS = {
  user: 'bg-blue-100 text-blue-800',
  contact: 'bg-green-100 text-green-800',
  lead: 'bg-yellow-100 text-yellow-800',
  visitor: 'bg-gray-100 text-gray-800'
}

export default function IntercomUsersPage() {
  const [users, setUsers] = useState<IntercomUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<IntercomUser[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [emailStatusFilter, setEmailStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'last_seen_at'>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const itemsPerPage = 20

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterAndSortUsers()
  }, [users, searchTerm, typeFilter, emailStatusFilter, sortBy, sortOrder])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('intercom_users')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortUsers = () => {
    let filtered = [...users]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.external_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(user => user.type === typeFilter)
    }

    // Apply email status filter
    if (emailStatusFilter !== 'all') {
      switch (emailStatusFilter) {
        case 'subscribed':
          filtered = filtered.filter(user => !user.unsubscribed_from_emails && !user.marked_email_as_spam)
          break
        case 'unsubscribed':
          filtered = filtered.filter(user => user.unsubscribed_from_emails)
          break
        case 'spam':
          filtered = filtered.filter(user => user.marked_email_as_spam)
          break
        case 'bounced':
          filtered = filtered.filter(user => user.has_hard_bounced)
          break
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'created_at':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'updated_at':
          compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
        case 'last_seen_at':
          const aLastSeen = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0
          const bLastSeen = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0
          compareValue = aLastSeen - bLastSeen
          break
      }

      return sortOrder === 'asc' ? compareValue : -compareValue
    })

    setFilteredUsers(filtered)
    setCurrentPage(1)
  }

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const selectAllVisible = () => {
    const visibleIds = paginatedUsers.map(user => user.user_id)
    setSelectedUsers(new Set(visibleIds))
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  const exportUsers = () => {
    const dataToExport = selectedUsers.size > 0
      ? filteredUsers.filter(user => selectedUsers.has(user.user_id))
      : filteredUsers

    const csv = [
      ['User ID', 'Type', 'Name', 'Email', 'Phone', 'Created', 'Last Seen', 'Sessions', 'Location'],
      ...dataToExport.map(user => [
        user.user_id,
        user.type || '',
        user.name || '',
        user.email || '',
        user.phone || '',
        formatValue(user.created_at, 'dateTime'),
        formatValue(user.last_seen_at, 'dateTime'),
        user.session_count?.toString() || '0',
        user.location_data?.city_name || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `intercom-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const refreshData = async () => {
    setSyncing(true)
    try {
      await fetchUsers()
    } finally {
      setSyncing(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  // Get unique types for filter
  const uniqueTypes = [...new Set(users.map(user => user.type).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Intercom Users
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredUsers.length} users found
              {selectedUsers.size > 0 && ` • ${selectedUsers.size} selected`}
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
              onClick={exportUsers}
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
              placeholder="Search users..."
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

          {/* Email Status Filter */}
          <select
            value={emailStatusFilter}
            onChange={(e) => setEmailStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Email Status</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="spam">Marked as Spam</option>
            <option value="bounced">Hard Bounced</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="updated_at">Sort by Updated</option>
            <option value="created_at">Sort by Created</option>
            <option value="last_seen_at">Sort by Last Seen</option>
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
        {selectedUsers.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear selection
            </button>
            <button
              onClick={selectAllVisible}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select all visible
            </button>
          </div>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {paginatedUsers.map((user) => (
          <div
            key={user.user_id}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
              selectedUsers.has(user.user_id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {user.avatar?.image_url ? (
                    <img
                      src={user.avatar.image_url}
                      alt={user.name || 'User avatar'}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {user.name || user.email || `User ${user.user_id.slice(-6)}`}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      USER_TYPE_COLORS[user.type as keyof typeof USER_TYPE_COLORS] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.type}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.user_id)}
                  onChange={() => toggleUserSelection(user.user_id)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {user.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.location_data?.city_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{user.location_data.city_name}, {user.location_data.country_name}</span>
                  </div>
                )}
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Sessions</div>
                  <div className="font-medium">{user.session_count || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Last Seen</div>
                  <div className="font-medium">
                    {user.last_seen_at ? formatValue(user.last_seen_at, 'date') : 'Never'}
                  </div>
                </div>
              </div>

              {/* Email Status Indicators */}
              <div className="flex flex-wrap gap-1 mb-3">
                {user.unsubscribed_from_emails && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                    Unsubscribed
                  </span>
                )}
                {user.marked_email_as_spam && (
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
                    Spam
                  </span>
                )}
                {user.has_hard_bounced && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                    Bounced
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {formatValue(user.created_at, 'date')}
                </div>
                <button
                  onClick={() => setShowDetails(showDetails === user.user_id ? null : user.user_id)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {showDetails === user.user_id ? 'Hide' : 'Details'}
                </button>
              </div>

              {/* Expanded Details */}
              {showDetails === user.user_id && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-2">
                  <div><strong>User ID:</strong> {user.user_id}</div>
                  {user.external_id && <div><strong>External ID:</strong> {user.external_id}</div>}
                  <div><strong>Updated:</strong> {formatValue(user.updated_at, 'dateTime')}</div>
                  {user.signed_up_at && <div><strong>Signed Up:</strong> {formatValue(user.signed_up_at, 'dateTime')}</div>}
                  {user.last_contacted_at && <div><strong>Last Contacted:</strong> {formatValue(user.last_contacted_at, 'dateTime')}</div>}
                  {user.location_data?.timezone && <div><strong>Timezone:</strong> {user.location_data.timezone}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredUsers.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || typeFilter !== 'all' || emailStatusFilter !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'No users have been synced yet'}
          </p>
        </div>
      )}
    </div>
  )
}