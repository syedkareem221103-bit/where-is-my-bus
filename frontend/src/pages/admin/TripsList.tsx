import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { MapPin } from 'lucide-react';

export function TripsList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Trips" 
        description="Monitor active and scheduled trips."
        actionLabel="Create Trip"
        onAction={() => console.log("Create Trip clicked")}
      />
      <EmptyState 
        title="No trips found"
        description="Schedule a new trip to get started."
        icon={MapPin}
        actionLabel="Create Trip"
        onAction={() => console.log("Create Trip clicked")}
      />
    </div>
  );
}
