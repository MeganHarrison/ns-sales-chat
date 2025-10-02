import { notFound } from 'next/navigation'
import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig, TableName } from '@/config/table-configs'

interface PageProps {
  params: {
    tableName: string
  }
}

// Map URL slugs to table names
const urlToTableMap: Record<string, TableName> = {
  'keap-tags': 'keap_tags',
  'request-offs': 'request_offs',
  'cancellations': 'cancellations',
  'contacts': 'contacts',
  'subscriptions': 'subscriptions',
  'orders': 'orders',
  'documents': 'documents',
  'products': 'products',
  'resources': 'resources'
}

export async function generateStaticParams() {
  return Object.keys(urlToTableMap).map((slug) => ({
    tableName: slug,
  }))
}

export default function TablePage({ params }: PageProps) {
  const tableName = urlToTableMap[params.tableName]

  if (!tableName) {
    notFound()
  }

  const config = getTableConfig(tableName)

  return <TableLayout config={config} />
}