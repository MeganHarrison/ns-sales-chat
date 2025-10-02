import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function ProductsPage() {
  const config = getTableConfig('products')
  return <TableLayout config={config} />
}