import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OAuthManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>OAuth Configuration</CardTitle>
        <CardDescription>
          Manage OAuth settings for Keap integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Keap OAuth Status</div>
              <div className="text-sm text-muted-foreground">
                Current authorization status
              </div>
            </div>
            <Badge variant="default">Authorized</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                placeholder="Enter Keap Client ID"
                defaultValue="****-****-****-****"
                type="password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                placeholder="Enter Keap Client Secret"
                defaultValue="****-****-****-****"
                type="password"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="redirect-uri">Redirect URI</Label>
            <Input
              id="redirect-uri"
              placeholder="https://your-app.com/oauth/callback"
              defaultValue="https://app.example.com/oauth/callback"
            />
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <Button>Save Configuration</Button>
            <Button variant="outline">Test OAuth Flow</Button>
            <Button variant="destructive">Revoke Access</Button>
          </div>
          
          <div className="border-t border-[#f2f2f2] pt-4">
            <div className="text-sm">
              <div className="font-medium mb-2">OAuth Scopes</div>
              <div className="space-y-1">
                <Badge variant="secondary">contacts.read</Badge>
                <Badge variant="secondary">contacts.write</Badge>
                <Badge variant="secondary">orders.read</Badge>
                <Badge variant="secondary">orders.write</Badge>
                <Badge variant="secondary">tags.read</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}