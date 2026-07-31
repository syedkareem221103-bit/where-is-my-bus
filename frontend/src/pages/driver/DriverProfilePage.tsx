import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DriverProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Profile" 
      />
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Profile details placeholder...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
