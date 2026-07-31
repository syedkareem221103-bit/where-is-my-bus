import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Users as UsersIcon } from 'lucide-react';
import { useUsers } from '@/hooks/users/useUsers';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import type { UserResponse } from '@/types/user.dto';
import { StatusBadge } from '@/components/ui/status-badge';

export function UsersList() {
  const { data, isLoading, isError } = useUsers(undefined, 1, 50);

  const columns = [
    {
      header: 'Name',
      accessor: (user: UserResponse) => `${user.firstName} ${user.lastName}`,
    },
    {
      header: 'Email',
      accessor: (user: UserResponse) => user.email,
    },
    {
      header: 'Role',
      accessor: (user: UserResponse) => user.role.replace('_', ' '),
    },
    {
      header: 'Status',
      accessor: (user: UserResponse) => (
        <StatusBadge status={user.status} />
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Users" 
        description="Manage system administrators and operators."
        actionLabel="Add User"
        onAction={() => console.log("Add User clicked")}
      />

      {isLoading && <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}

      {isError && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
          Failed to load users. Please try again.
        </div>
      )}

      {!isLoading && !isError && data?.data && data.data.length > 0 && (
        <DataTable 
          data={data.data} 
          columns={columns} 
          
          
        />
      )}

      {!isLoading && !isError && (!data?.data || data.data.length === 0) && (
        <EmptyState 
          title="No users found"
          description="Get started by creating a new user."
          icon={UsersIcon}
          actionLabel="Add User"
          onAction={() => console.log("Add User clicked")}
        />
      )}
    </div>
  );
}
