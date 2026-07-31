import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export function ParentsList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Parents" 
        description="Manage parent accounts and student associations."
        actionLabel="Add Parent"
        onAction={() => console.log("Add Parent clicked")}
      />
      <EmptyState 
        title="No parents found"
        description="Get started by adding a new parent."
        icon={Users}
        actionLabel="Add Parent"
        onAction={() => console.log("Add Parent clicked")}
      />
    </div>
  );
}
