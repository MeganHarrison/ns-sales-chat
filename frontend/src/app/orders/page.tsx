import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function OrdersPage() {
  const config = getTableConfig('orders')
  return <TableLayout config={config} />
}