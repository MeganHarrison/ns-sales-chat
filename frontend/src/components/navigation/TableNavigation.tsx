import Link from 'next/link'
import { Users, Tag, Package, FileText, ShoppingCart, Calendar, XCircle, BookOpen, Grid } from 'lucide-react'

const tableLinks = [
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/subscriptions', label: 'Subscriptions', icon: Calendar },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/keap-tags', label: 'Keap Tags', icon: Tag },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/resources', label: 'Resources', icon: BookOpen },
  { href: '/request-offs', label: 'Request Offs', icon: Calendar },
  { href: '/cancellations', label: 'Cancellations', icon: XCircle },
]

export default function TableNavigation() {
  return (
    <nav className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Tables</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {tableLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}