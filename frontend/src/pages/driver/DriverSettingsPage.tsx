import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DriverSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
      />
      <Card>
        <CardHeader>
          <CardTitle>App Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Settings form placeholder...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
