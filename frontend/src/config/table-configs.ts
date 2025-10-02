import { Database } from '@/types/supabase-tables'

export type TableName = keyof Database['public']['Tables']

export interface ColumnConfig {
  key: string
  label: string
  sortable?: boolean
  searchable?: boolean
  type?: 'text' | 'number' | 'date' | 'boolean' | 'status' | 'currency' | 'json'
  width?: string
  formatter?: (value: any) => string | React.ReactNode
  className?: string
}

export interface TableConfig {
  tableName: TableName
  displayName: string
  singularName: string
  primaryKey: string
  columns: ColumnConfig[]
  searchableColumns?: string[]
  defaultSort?: { column: string; direction: 'asc' | 'desc' }
  rowsPerPage?: number
  filters?: Array<{
    key: string
    label: string
    type: 'select' | 'date' | 'text' | 'boolean'
    options?: Array<{ value: string; label: string }>
  }>
  actions?: Array<{
    type: 'sync' | 'export' | 'import' | 'add'
    label?: string
  }>
  statusField?: string
  statusOptions?: Array<{ value: string; label: string; color: string }>
}

export const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  processed: 'bg-blue-100 text-blue-800',
  refunded: 'bg-purple-100 text-purple-800',
  discontinued: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export const tableConfigs: Record<TableName, TableConfig> = {
  keap_tags: {
    tableName: 'keap_tags',
    displayName: 'Keap Tags',
    singularName: 'Tag',
    primaryKey: 'id',
    defaultSort: { column: 'name', direction: 'asc' },
    columns: [
      { key: 'keap_id', label: 'Keap ID', searchable: true },
      { key: 'name', label: 'Tag Name', sortable: true, searchable: true },
      { key: 'description', label: 'Description', searchable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'created_date', label: 'Created', type: 'date', sortable: true },
      { key: 'last_updated', label: 'Last Updated', type: 'dateTime' }
    ],
    searchableColumns: ['name', 'description', 'category'],
    filters: [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'all', label: 'All Categories' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'sales', label: 'Sales' },
          { value: 'customer', label: 'Customer' }
        ]
      }
    ],
    actions: ['sync', 'export']
  },

  request_offs: {
    tableName: 'request_offs',
    displayName: 'Request Offs',
    singularName: 'Request Off',
    primaryKey: 'id',
    defaultSort: { column: 'request_date', direction: 'desc' },
    columns: [
      { key: 'employee_name', label: 'Employee', sortable: true, searchable: true },
      { key: 'request_date', label: 'Request Date', type: 'date', sortable: true },
      { key: 'start_date', label: 'Start Date', type: 'date', sortable: true },
      { key: 'end_date', label: 'End Date', type: 'date' },
      { key: 'reason', label: 'Reason', searchable: true },
      { key: 'status', label: 'Status', type: 'status', sortable: true },
      { key: 'approved_by', label: 'Approved By' }
    ],
    searchableColumns: ['employee_name', 'reason'],
    statusField: 'status',
    statusOptions: [
      { value: 'pending', label: 'Pending', color: statusColors.pending },
      { value: 'approved', label: 'Approved', color: statusColors.approved },
      { value: 'rejected', label: 'Rejected', color: statusColors.rejected }
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }
        ]
      }
    ],
    actions: ['add', 'export']
  },

  cancellations: {
    tableName: 'cancellations',
    displayName: 'Cancellations',
    singularName: 'Cancellation',
    primaryKey: 'id',
    defaultSort: { column: 'cancellation_date', direction: 'desc' },
    columns: [
      { key: 'customer_name', label: 'Customer', sortable: true, searchable: true },
      { key: 'customer_email', label: 'Email', searchable: true },
      { key: 'order_id', label: 'Order ID' },
      { key: 'subscription_id', label: 'Subscription ID' },
      { key: 'cancellation_date', label: 'Cancellation Date', type: 'date', sortable: true },
      { key: 'reason', label: 'Reason', searchable: true },
      { key: 'status', label: 'Status', type: 'status', sortable: true },
      { key: 'refund_amount', label: 'Refund', type: 'currency' }
    ],
    searchableColumns: ['customer_name', 'customer_email', 'reason'],
    statusField: 'status',
    statusOptions: [
      { value: 'pending', label: 'Pending', color: statusColors.pending },
      { value: 'processed', label: 'Processed', color: statusColors.processed },
      { value: 'refunded', label: 'Refunded', color: statusColors.refunded }
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'pending', label: 'Pending' },
          { value: 'processed', label: 'Processed' },
          { value: 'refunded', label: 'Refunded' }
        ]
      }
    ],
    actions: ['export']
  },

  contacts: {
    tableName: 'contacts',
    displayName: 'Contacts',
    singularName: 'Contact',
    primaryKey: 'id',
    defaultSort: { column: 'last_name', direction: 'asc' },
    columns: [
      { key: 'keap_id', label: 'Keap ID' },
      { key: 'first_name', label: 'First Name', sortable: true, searchable: true },
      { key: 'last_name', label: 'Last Name', sortable: true, searchable: true },
      { key: 'email', label: 'Email', searchable: true },
      { key: 'phone', label: 'Phone', searchable: true },
      { key: 'tags', label: 'Tags', type: 'json' },
      { key: 'keap_created_date', label: 'Created', type: 'date' },
      { key: 'last_synced_at', label: 'Last Synced', type: 'dateTime' }
    ],
    searchableColumns: ['first_name', 'last_name', 'email', 'phone'],
    actions: ['sync', 'export', 'import']
  },

  subscriptions: {
    tableName: 'subscriptions',
    displayName: 'Subscriptions',
    singularName: 'Subscription',
    primaryKey: 'id',
    defaultSort: { column: 'next_charge_date', direction: 'asc' },
    columns: [
      { key: 'keap_id', label: 'Keap ID' },
      { key: 'contact_keap_id', label: 'Contact ID' },
      { key: 'product_name', label: 'Product', sortable: true, searchable: true },
      { key: 'status', label: 'Status', type: 'status', sortable: true },
      { key: 'frequency', label: 'Frequency', sortable: true },
      { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
      { key: 'next_charge_date', label: 'Next Charge', type: 'date', sortable: true },
      { key: 'last_synced_at', label: 'Last Synced', type: 'dateTime' }
    ],
    searchableColumns: ['product_name'],
    statusField: 'status',
    statusOptions: [
      { value: 'active', label: 'Active', color: statusColors.active },
      { value: 'cancelled', label: 'Cancelled', color: statusColors.cancelled },
      { value: 'pending', label: 'Pending', color: statusColors.pending }
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'active', label: 'Active' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'pending', label: 'Pending' }
        ]
      }
    ],
    actions: ['sync', 'export']
  },

  orders: {
    tableName: 'orders',
    displayName: 'Orders',
    singularName: 'Order',
    primaryKey: 'id',
    defaultSort: { column: 'order_date', direction: 'desc' },
    columns: [
      { key: 'keap_id', label: 'Order ID', searchable: true },
      { key: 'order_title', label: 'Title', searchable: true },
      { key: 'contact_keap_id', label: 'Contact ID' },
      { key: 'order_date', label: 'Order Date', type: 'date', sortable: true },
      { key: 'order_status', label: 'Status', type: 'status', sortable: true },
      { key: 'order_total', label: 'Total', type: 'currency', sortable: true },
      { key: 'products', label: 'Products', type: 'json' },
      { key: 'last_synced_at', label: 'Last Synced', type: 'dateTime' }
    ],
    searchableColumns: ['order_title', 'keap_id'],
    statusField: 'order_status',
    statusOptions: [
      { value: 'paid', label: 'Paid', color: statusColors.paid },
      { value: 'pending', label: 'Pending', color: statusColors.pending },
      { value: 'cancelled', label: 'Cancelled', color: statusColors.cancelled }
    ],
    filters: [
      {
        key: 'order_status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'paid', label: 'Paid' },
          { value: 'pending', label: 'Pending' },
          { value: 'cancelled', label: 'Cancelled' }
        ]
      }
    ],
    actions: ['sync', 'export']
  },

  documents: {
    tableName: 'documents',
    displayName: 'Documents',
    singularName: 'Document',
    primaryKey: 'id',
    defaultSort: { column: 'created_at', direction: 'desc' },
    columns: [
      { key: 'title', label: 'Title', sortable: true, searchable: true },
      { key: 'description', label: 'Description', searchable: true },
      { key: 'file_type', label: 'Type', sortable: true },
      { key: 'file_size', label: 'Size', type: 'fileSize' },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'uploaded_by', label: 'Uploaded By' },
      { key: 'created_at', label: 'Created', type: 'date', sortable: true }
    ],
    searchableColumns: ['title', 'description'],
    filters: [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'all', label: 'All Categories' },
          { value: 'contracts', label: 'Contracts' },
          { value: 'reports', label: 'Reports' },
          { value: 'policies', label: 'Policies' }
        ]
      }
    ],
    actions: ['add', 'export']
  },

  products: {
    tableName: 'products',
    displayName: 'Products',
    singularName: 'Product',
    primaryKey: 'id',
    defaultSort: { column: 'name', direction: 'asc' },
    columns: [
      { key: 'sku', label: 'SKU', searchable: true },
      { key: 'name', label: 'Product Name', sortable: true, searchable: true },
      { key: 'price', label: 'Price', type: 'currency', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'status', label: 'Status', type: 'status', sortable: true },
      { key: 'stock_quantity', label: 'Stock', type: 'number', sortable: true },
      { key: 'description', label: 'Description', searchable: true }
    ],
    searchableColumns: ['name', 'sku', 'description'],
    statusField: 'status',
    statusOptions: [
      { value: 'active', label: 'Active', color: statusColors.active },
      { value: 'inactive', label: 'Inactive', color: statusColors.inactive },
      { value: 'discontinued', label: 'Discontinued', color: statusColors.discontinued }
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'discontinued', label: 'Discontinued' }
        ]
      },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'all', label: 'All Categories' }
        ]
      }
    ],
    actions: ['add', 'sync', 'export']
  },

  resources: {
    tableName: 'resources',
    displayName: 'Resources',
    singularName: 'Resource',
    primaryKey: 'id',
    defaultSort: { column: 'name', direction: 'asc' },
    columns: [
      { key: 'name', label: 'Resource Name', sortable: true, searchable: true },
      { key: 'type', label: 'Type', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'description', label: 'Description', searchable: true },
      { key: 'access_level', label: 'Access Level', type: 'status' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
      { key: 'created_at', label: 'Created', type: 'date', sortable: true }
    ],
    searchableColumns: ['name', 'description'],
    statusField: 'access_level',
    statusOptions: [
      { value: 'public', label: 'Public', color: statusColors.active },
      { value: 'restricted', label: 'Restricted', color: statusColors.pending },
      { value: 'private', label: 'Private', color: statusColors.inactive }
    ],
    filters: [
      {
        key: 'access_level',
        label: 'Access Level',
        type: 'select',
        options: [
          { value: 'all', label: 'All Levels' },
          { value: 'public', label: 'Public' },
          { value: 'restricted', label: 'Restricted' },
          { value: 'private', label: 'Private' }
        ]
      },
      {
        key: 'is_active',
        label: 'Status',
        type: 'boolean',
        options: [
          { value: 'all', label: 'All' },
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Inactive' }
        ]
      }
    ],
    actions: ['add', 'export']
  }
}

export function getTableConfig(tableName: TableName): TableConfig {
  return tableConfigs[tableName]
}