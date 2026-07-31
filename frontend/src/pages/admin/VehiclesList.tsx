import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Car } from 'lucide-react';

export function VehiclesList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Vehicles" 
        description="Manage your fleet, maintenance schedules, and assignments."
        actionLabel="Add Vehicle"
        onAction={() => console.log("Add Vehicle clicked")}
      />
      <EmptyState 
        title="No vehicles found"
        description="Get started by adding a new vehicle to your fleet."
        icon={Car}
        actionLabel="Add Vehicle"
        onAction={() => console.log("Add Vehicle clicked")}
      />
    </div>
  );
}
