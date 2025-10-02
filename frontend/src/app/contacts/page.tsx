import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function ContactsPage() {
  const config = getTableConfig('contacts')
  return <TableLayout config={config} />
}