import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Users as UsersIcon } from 'lucide-react';
import { useDrivers } from '@/hooks/drivers/useDrivers';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import type { DriverResponse } from '@/types/driver.dto';
import { StatusBadge } from '@/components/ui/status-badge';

export function DriversList() {
  const { data, isLoading, isError } = useDrivers(1, 50);

  const columns = [
    {
      header: 'Name',
      accessor: (driver: DriverResponse) => `${driver.firstName} ${driver.lastName}`,
    },
    {
      header: 'License Number',
      accessor: (driver: DriverResponse) => driver.driverLicense?.licenseNumber || 'N/A',
    },
    {
      header: 'Status',
      accessor: (driver: DriverResponse) => (
        <StatusBadge status={driver.status} />
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Drivers" 
        description="Manage vehicle operators and licenses."
        actionLabel="Add Driver"
        onAction={() => console.log("Add Driver clicked")}
      />

      {isLoading && <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}

      {isError && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
          Failed to load drivers. Please try again.
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
          title="No drivers found"
          description="Get started by adding a driver."
          icon={UsersIcon}
          actionLabel="Add Driver"
          onAction={() => console.log("Add Driver clicked")}
        />
      )}
    </div>
  );
}
