import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ConflictSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conflict Resolution Settings</CardTitle>
        <CardDescription>
          Configure how sync conflicts are handled automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-conflicts">Contact Conflicts</Label>
            <Select defaultValue="manual">
              <SelectTrigger>
                <SelectValue placeholder="Select resolution strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Resolution</SelectItem>
                <SelectItem value="keap-wins">Keap Data Wins</SelectItem>
                <SelectItem value="supabase-wins">Supabase Data Wins</SelectItem>
                <SelectItem value="newest-wins">Newest Data Wins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order-conflicts">Order Conflicts</Label>
            <Select defaultValue="manual">
              <SelectTrigger>
                <SelectValue placeholder="Select resolution strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Resolution</SelectItem>
                <SelectItem value="keap-wins">Keap Data Wins</SelectItem>
                <SelectItem value="supabase-wins">Supabase Data Wins</SelectItem>
                <SelectItem value="newest-wins">Newest Data Wins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Manual resolution requires admin intervention for all conflicts
          </div>
          <Button>Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  )
}