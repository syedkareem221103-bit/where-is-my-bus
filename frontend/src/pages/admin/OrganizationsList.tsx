import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2 } from 'lucide-react';

export function OrganizationsList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Organizations" 
        description="Manage schools, transport companies, and organizations."
        actionLabel="Add Organization"
        onAction={() => console.log("Add Organization clicked")}
      />
      <EmptyState 
        title="No organizations found"
        description="Get started by creating a new organization."
        icon={Building2}
        actionLabel="Add Organization"
        onAction={() => console.log("Add Organization clicked")}
      />
    </div>
  );
}
