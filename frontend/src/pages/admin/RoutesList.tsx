import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Map } from 'lucide-react';

export function RoutesList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Routes" 
        description="Manage transport routes and stops."
        actionLabel="Create Route"
        onAction={() => console.log("Create Route clicked")}
      />
      <EmptyState 
        title="No routes found"
        description="Get started by creating a new route."
        icon={Map}
        actionLabel="Create Route"
        onAction={() => console.log("Create Route clicked")}
      />
    </div>
  );
}
