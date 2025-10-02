'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Search, Filter, Tag, Download, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatValue } from '@/lib/formatters'
import { statusColors } from '@/config/table-configs'

interface KeapTag {
  id: string
  keap_id: string
  name: string
  description: string | null
  category: string | null
  created_date: string | null
  last_updated: string | null
  contact_count?: number
  is_active?: boolean
}

export default function KeapTagsPage() {
  const [tags, setTags] = useState<KeapTag[]>([])
  const [filteredTags, setFilteredTags] = useState<KeapTag[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'contacts'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const supabase = createClient()

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    filterAndSortTags()
  }, [tags, searchTerm, selectedCategory, sortBy, sortOrder])

  const fetchTags = async () => {
    setLoading(true)
    try {
      // For demo purposes, we'll use the sync endpoint to get tags
      // In production, this would fetch from your database
      const response = await fetch('/api/sync/keap-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch tags')

      const result = await response.json()

      if (result.tags) {
        setTags(result.tags)
        // Extract unique categories
        const uniqueCategories = [...new Set(result.tags.map((tag: KeapTag) => tag.category).filter(Boolean))]
        setCategories(uniqueCategories as string[])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      // Set empty tags on error
      setTags([])
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortTags = () => {
    let filtered = [...tags]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tag.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tag.keap_id.toString().includes(searchTerm)
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tag => tag.category === selectedCategory)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name)
          break
        case 'created':
          compareValue = new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime()
          break
        case 'contacts':
          compareValue = (a.contact_count || 0) - (b.contact_count || 0)
          break
      }

      return sortOrder === 'asc' ? compareValue : -compareValue
    })

    setFilteredTags(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const syncWithKeap = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/sync/keap-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        console.log('Sync successful:', result.message)
        await fetchTags()
      } else {
        console.error('Sync failed:', result.error)
        alert(`Sync failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Failed to sync with Keap. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const toggleTagSelection = (tagId: string) => {
    const newSelection = new Set(selectedTags)
    if (newSelection.has(tagId)) {
      newSelection.delete(tagId)
    } else {
      newSelection.add(tagId)
    }
    setSelectedTags(newSelection)
  }

  const selectAllVisible = () => {
    const visibleTagIds = paginatedTags.map(tag => tag.id)
    setSelectedTags(new Set(visibleTagIds))
  }

  const clearSelection = () => {
    setSelectedTags(new Set())
  }

  const exportTags = () => {
    const dataToExport = selectedTags.size > 0
      ? filteredTags.filter(tag => selectedTags.has(tag.id))
      : filteredTags

    const csv = [
      ['Keap ID', 'Name', 'Description', 'Category', 'Created Date', 'Last Updated'],
      ...dataToExport.map(tag => [
        tag.keap_id,
        tag.name,
        tag.description || '',
        tag.category || '',
        formatValue(tag.created_date, 'date'),
        formatValue(tag.last_updated, 'dateTime')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keap-tags-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Pagination
  const totalPages = Math.ceil(filteredTags.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTags = filteredTags.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tags...</p>
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
              <Tag className="h-6 w-6 text-blue-600" />
              Keap Tags Management
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredTags.length} tags found
              {selectedTags.size > 0 && ` • ${selectedTags.size} selected`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={syncWithKeap}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync with Keap'}
            </button>
            <button
              onClick={exportTags}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="created">Sort by Created Date</option>
            <option value="contacts">Sort by Contact Count</option>
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
        {selectedTags.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedTags.size} tag{selectedTags.size !== 1 ? 's' : ''} selected
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

      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {paginatedTags.map(tag => (
          <div
            key={tag.id}
            className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all hover:shadow-md ${
              selectedTags.has(tag.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{tag.name}</h3>
                <p className="text-xs text-gray-500">Keap ID: {tag.keap_id}</p>
              </div>
              <input
                type="checkbox"
                checked={selectedTags.has(tag.id)}
                onChange={() => toggleTagSelection(tag.id)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </div>

            {tag.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {tag.description}
              </p>
            )}

            <div className="space-y-2">
              {tag.category && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Category:</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {tag.category}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Created: {formatValue(tag.created_date, 'date')}</span>
                {tag.contact_count !== undefined && (
                  <span className="font-medium">{tag.contact_count} contacts</span>
                )}
              </div>

              {tag.last_updated && (
                <div className="text-xs text-gray-400">
                  Updated: {formatValue(tag.last_updated, 'dateTime')}
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
      {filteredTags.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tags found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Sync with Keap to import your tags'}
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <button
              onClick={syncWithKeap}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sync with Keap
            </button>
          )}
        </div>
      )}
    </div>
  )
}