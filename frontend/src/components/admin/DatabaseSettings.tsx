import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function DatabaseSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Configuration</CardTitle>
        <CardDescription>
          Manage database connections and maintenance tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Supabase Connection</span>
              <Badge variant="default">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Pool</span>
              <Badge variant="secondary">8/10 Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Backup</span>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              Test Connection
            </Button>
            <Button variant="outline" className="w-full">
              Backup Database
            </Button>
            <Button variant="outline" className="w-full">
              Clean Old Logs
            </Button>
          </div>
        </div>
        
        <div className="border-t border-[#f2f2f2] pt-4">
          <h4 className="font-medium mb-2">Database Statistics</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">Total Records</div>
              <div className="text-muted-foreground">12,543</div>
            </div>
            <div>
              <div className="font-medium">Storage Used</div>
              <div className="text-muted-foreground">245 MB</div>
            </div>
            <div>
              <div className="font-medium">Active Sessions</div>
              <div className="text-muted-foreground">8</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}