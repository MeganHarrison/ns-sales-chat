import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function CancellationsPage() {
  const config = getTableConfig('cancellations')
  return <TableLayout config={config} />
}