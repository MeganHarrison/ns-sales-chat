import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function WebhookSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Configuration</CardTitle>
        <CardDescription>
          Configure webhook endpoints for real-time sync
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Webhook Status</div>
              <div className="text-sm text-muted-foreground">
                Real-time sync via webhooks
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://your-app.com/webhook"
              defaultValue="https://app.example.com/api/webhook/keap"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <Input
              id="webhook-secret"
              placeholder="Enter webhook secret"
              defaultValue="****-****-****-****"
              type="password"
            />
          </div>
          
          <div className="space-y-3">
            <Label>Event Types</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Contact Created</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Contact Updated</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Order Created</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Order Updated</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tag Applied</span>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <Button>Save Configuration</Button>
            <Button variant="outline">Test Webhook</Button>
          </div>
          
          <div className="border-t border-[#f2f2f2] pt-4">
            <div className="flex items-center justify-between text-sm">
              <span>Last Event Received</span>
              <span className="text-muted-foreground">5 minutes ago</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Events Today</span>
              <Badge variant="secondary">247</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}