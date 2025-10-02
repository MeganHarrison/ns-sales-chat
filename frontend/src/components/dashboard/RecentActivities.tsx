import { getRecentSyncActivities } from "@/lib/dashboard-queries";
import { formatDistanceToNow } from "date-fns";
import {
  formatSyncDirection,
  formatSyncStatus,
  getEntityTypeDisplayName,
} from "@/lib/keap-sync";

export async function RecentActivities() {
  const activities = await getRecentSyncActivities(20);

  if (!activities.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recent sync activities found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 rounded"
        >
          <div className="flex items-center space-x-4">
            <div
              className={`w-2 h-2 rounded-full ${
                activity.conflict_status === "pending"
                  ? "bg-red-500"
                  : activity.last_error
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            />
            <div>
              <div className="font-medium">
                {getEntityTypeDisplayName(activity.entity_type)} Sync
              </div>
              <div className="text-xs text-muted-foreground">
                ID: {activity.keap_id}
              </div>
              {activity.last_error && (
                <div className="text-sm text-red-600 mt-1">
                  Error: {activity.last_error}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium">
              {formatSyncDirection(activity.sync_direction)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.last_synced_at), {
                addSuffix: true,
              })}
            </div>
            <div className="text-xs">
              {formatSyncStatus(activity.conflict_status)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
