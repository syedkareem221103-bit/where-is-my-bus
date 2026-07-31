import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export function UsersList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Users" 
        description="Manage system administrators and operators."
        actionLabel="Add User"
        onAction={() => console.log("Add User clicked")}
      />
      <EmptyState 
        title="No users found"
        description="Get started by creating a new user."
        icon={Users}
        actionLabel="Add User"
        onAction={() => console.log("Add User clicked")}
      />
    </div>
  );
}
