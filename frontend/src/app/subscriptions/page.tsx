import TableLayout from '@/components/tables/TableLayout'
import { getTableConfig } from '@/config/table-configs'

export default function SubscriptionsPage() {
  const config = getTableConfig('subscriptions')
  return <TableLayout config={config} />
}