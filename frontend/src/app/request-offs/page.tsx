import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function RequestOffsPage() {
  const config = getTableConfig('request_offs')
  return <TableLayout config={config} />
}