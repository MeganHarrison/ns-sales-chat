'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Search, Download, Plus, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TableConfig, TableName, ColumnConfig, statusColors } from '@/config/table-configs'
import { TableRow } from '@/types/supabase-tables'
import { formatValue } from '@/lib/formatters'

interface TableLayoutProps {
  config: TableConfig
}

export default function TableLayout({ config }: TableLayoutProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sortColumn, setSortColumn] = useState(config.defaultSort?.column || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(config.defaultSort?.direction || 'asc')

  const supabase = createClient()
  const rowsPerPage = config.rowsPerPage || 10

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      let query = supabase.from(config.tableName).select('*')

      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' })
      }

      const { data: fetchedData, error } = await query

      if (error) throw error
      setData(fetchedData || [])
    } catch (error) {
      console.error(`Failed to fetch ${config.displayName}:`, error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      // This would call your sync endpoint
      alert(`Sync functionality for ${config.displayName} would be implemented here`)
      await fetchData()
    } catch (error) {
      console.error(`Failed to sync ${config.displayName}:`, error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = config.columns.map(col => col.label)
    const rows = filteredData.map(row =>
      config.columns.map(col => {
        const value = row[col.key]
        if (col.formatter) {
          const formatted = col.formatter(value)
          return typeof formatted === 'string' ? formatted : String(value || '')
        }
        return String(value || '')
      })
    )

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.tableName}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleSort = (column: string) => {
    if (!config.columns.find(c => c.key === column)?.sortable) return

    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter and search logic
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Apply search
    if (searchTerm && config.searchableColumns) {
      filtered = filtered.filter(row => {
        return config.searchableColumns?.some(col => {
          const value = row[col]
          if (value === null || value === undefined) return false
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      })
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        if (value === 'true' || value === 'false') {
          filtered = filtered.filter(row => String(row[key]) === value)
        } else {
          filtered = filtered.filter(row => row[key] === value)
        }
      }
    })

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        if (aVal === null) return sortDirection === 'asc' ? 1 : -1
        if (bVal === null) return sortDirection === 'asc' ? -1 : 1

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, searchTerm, filters, sortColumn, sortDirection])

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage
  const indexOfFirstRow = indexOfLastRow - rowsPerPage
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow)
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const getStatusColor = (value: string) => {
    const option = config.statusOptions?.find(opt => opt.value === value)
    return option?.color || 'bg-gray-100 text-gray-800'
  }

  const renderCellContent = (row: any, column: ColumnConfig) => {
    const value = row[column.key]

    if (column.type === 'status' && config.statusField === column.key) {
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {value}
        </span>
      )
    }

    if (column.type === 'json' && !['date', 'dateTime', 'currency', 'fileSize', 'boolean'].includes(column.type || '')) {
      return value ? (
        <span className="text-xs text-gray-500">
          {Array.isArray(value) ? `${value.length} items` : 'View'}
        </span>
      ) : '-'
    }

    return formatValue(value, column.type)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{config.displayName}</h1>
            <p className="text-gray-600">Manage and view {config.displayName.toLowerCase()}</p>
          </div>
          <div className="flex gap-2">
            {config.actions?.includes('add') && (
              <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <Plus className="h-4 w-4 mr-2" />
                Add {config.singularName}
              </button>
            )}
            {config.actions?.includes('sync') && (
              <button
                onClick={handleSync}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
              </button>
            )}
            {config.actions?.includes('export') && (
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={`Search ${config.displayName.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
          {config.filters?.map(filter => (
            <select
              key={filter.key}
              value={filters[filter.key] || 'all'}
              onChange={(e) => setFilters({ ...filters, [filter.key]: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              {filter.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Stats Cards (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total {config.displayName}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{data.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Filtered Results</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{filteredData.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {config.columns.map(column => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key)}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && sortColumn === column.key && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRows.map((row, index) => (
                <tr key={row[config.primaryKey] || index} className="hover:bg-gray-50">
                  {config.columns.map(column => (
                    <td key={column.key} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}>
                      {renderCellContent(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredData.length)} of{' '}
              {filteredData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  )
                }
                if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                  return <span key={pageNumber}>...</span>
                }
                return null
              })}

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}