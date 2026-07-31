import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { UserSquare2 } from 'lucide-react';

export function DriversList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Drivers" 
        description="Manage driver profiles and assignments."
        actionLabel="Add Driver"
        onAction={() => console.log("Add Driver clicked")}
      />
      <EmptyState 
        title="No drivers found"
        description="Get started by adding a new driver."
        icon={UserSquare2}
        actionLabel="Add Driver"
        onAction={() => console.log("Add Driver clicked")}
      />
    </div>
  );
}
