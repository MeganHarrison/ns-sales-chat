import TableNavigation from '@/components/navigation/TableNavigation'

export default function DataPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
        <p className="text-gray-600 mt-2">
          Access and manage all your Supabase tables from one central location
        </p>
      </div>

      <TableNavigation />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">CRM Data</h3>
          <p className="text-gray-600 text-sm mb-4">
            Manage contacts, orders, subscriptions, and tags synchronized from Keap
          </p>
          <div className="text-2xl font-bold text-blue-600">4 Tables</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Business Operations</h3>
          <p className="text-gray-600 text-sm mb-4">
            Track products, documents, resources, and business requests
          </p>
          <div className="text-2xl font-bold text-green-600">4 Tables</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Customer Service</h3>
          <p className="text-gray-600 text-sm mb-4">
            Handle cancellations and request offs efficiently
          </p>
          <div className="text-2xl font-bold text-purple-600">2 Tables</div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Quick Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click any table link above to view and manage the data</li>
          <li>• Use the search functionality to quickly find specific records</li>
          <li>• Export data to CSV for external analysis</li>
          <li>• Sync buttons will refresh data from external sources (where applicable)</li>
        </ul>
      </div>
    </div>
  )
}