'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Filter, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FilterState {
  entityTypes: string[]
  dateRange: string
  fields: string[]
}

export function ConflictFilters() {
  const [filters, setFilters] = useState<FilterState>({
    entityTypes: [],
    dateRange: 'all',
    fields: []
  })

  const [activeFilters, setActiveFilters] = useState(0)

  const entityTypes = [
    { value: 'contacts', label: 'Contacts' },
    { value: 'orders', label: 'Orders' },
    { value: 'tags', label: 'Tags' },
    { value: 'subscriptions', label: 'Subscriptions' },
  ]

  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 days' },
    { value: '30days', label: 'Last 30 days' },
    { value: '90days', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
  ]

  const commonFields = [
    'email',
    'first_name',
    'last_name',
    'phone',
    'address',
    'tags',
    'custom_fields',
    'total',
    'status',
    'created_date'
  ]

  const toggleEntityType = (entityType: string) => {
    const newEntityTypes = filters.entityTypes.includes(entityType)
      ? filters.entityTypes.filter(t => t !== entityType)
      : [...filters.entityTypes, entityType]
    
    setFilters({ ...filters, entityTypes: newEntityTypes })
    updateActiveFilters({ ...filters, entityTypes: newEntityTypes })
  }

  const toggleField = (field: string) => {
    const newFields = filters.fields.includes(field)
      ? filters.fields.filter(f => f !== field)
      : [...filters.fields, field]
    
    setFilters({ ...filters, fields: newFields })
    updateActiveFilters({ ...filters, fields: newFields })
  }

  const setDateRange = (dateRange: string) => {
    setFilters({ ...filters, dateRange })
    updateActiveFilters({ ...filters, dateRange })
  }

  const updateActiveFilters = (newFilters: FilterState) => {
    let count = 0
    if (newFilters.entityTypes.length > 0) count++
    if (newFilters.dateRange !== 'all') count++
    if (newFilters.fields.length > 0) count++
    setActiveFilters(count)
  }

  const clearFilters = () => {
    const newFilters = {
      entityTypes: [],
      dateRange: 'all',
      fields: []
    }
    setFilters(newFilters)
    setActiveFilters(0)
  }

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {activeFilters > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFilters}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuLabel>Filter Conflicts</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Entity Types */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Entity Type</DropdownMenuLabel>
          {entityTypes.map((entityType) => (
            <DropdownMenuCheckboxItem
              key={entityType.value}
              checked={filters.entityTypes.includes(entityType.value)}
              onCheckedChange={() => toggleEntityType(entityType.value)}
            >
              {entityType.label}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Date Range */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Date Range</DropdownMenuLabel>
          {dateRanges.map((range) => (
            <DropdownMenuItem
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={filters.dateRange === range.value ? 'bg-accent' : ''}
            >
              {range.label}
              {filters.dateRange === range.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Common Fields */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Conflicted Fields</DropdownMenuLabel>
          <div className="max-h-32 overflow-y-auto">
            {commonFields.map((field) => (
              <DropdownMenuCheckboxItem
                key={field}
                checked={filters.fields.includes(field)}
                onCheckedChange={() => toggleField(field)}
              >
                {field}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
          
          {activeFilters > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearFilters} className="text-red-600">
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filter Tags */}
      {filters.entityTypes.length > 0 && (
        <div className="flex items-center space-x-1">
          {filters.entityTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {entityTypes.find(et => et.value === type)?.label}
              <button 
                onClick={() => toggleEntityType(type)}
                className="ml-1 hover:bg-background rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {filters.dateRange !== 'all' && (
        <Badge variant="secondary" className="text-xs">
          {dateRanges.find(dr => dr.value === filters.dateRange)?.label}
          <button 
            onClick={() => setDateRange('all')}
            className="ml-1 hover:bg-background rounded-full"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.fields.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {filters.fields.length} field{filters.fields.length > 1 ? 's' : ''}
          <button 
            onClick={() => setFilters({ ...filters, fields: [] })}
            className="ml-1 hover:bg-background rounded-full"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  )
}