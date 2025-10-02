import Link from 'next/link'
import { getPendingConflicts } from '@/lib/dashboard-queries'
import { getEntityTypeDisplayName } from '@/lib/keap-sync'

export async function ConflictAlerts() {
  const conflicts = await getPendingConflicts()

  if (!conflicts.length) {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-[#f2f2f2] rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="h-5 w-5 text-yellow-400">⚠️</div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            {conflicts.length} Sync Conflict{conflicts.length > 1 ? 's' : ''} Need Resolution
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              There {conflicts.length === 1 ? 'is' : 'are'} {conflicts.length} pending sync conflict
              {conflicts.length > 1 ? 's' : ''} that require manual resolution:
            </p>
            <ul className="mt-2 space-y-1">
              {conflicts.slice(0, 3).map((conflict) => (
                <li key={conflict.id} className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 flex-shrink-0"></span>
                  {getEntityTypeDisplayName(conflict.entity_type)} - ID: {conflict.entity_id}
                  <span className="ml-2 text-xs">
                    ({conflict.conflict_fields.length} field{conflict.conflict_fields.length > 1 ? 's' : ''})
                  </span>
                </li>
              ))}
              {conflicts.length > 3 && (
                <li className="text-xs">
                  ... and {conflicts.length - 3} more
                </li>
              )}
            </ul>
          </div>
          <div className="mt-4">
            <Link
              href="/dashboard/conflicts"
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
            >
              Resolve conflicts →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}