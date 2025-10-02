import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function DocumentsPage() {
  const config = getTableConfig('documents')
  return <TableLayout config={config} />
}