import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function ResourcesPage() {
  const config = getTableConfig('resources')
  return <TableLayout config={config} />
}