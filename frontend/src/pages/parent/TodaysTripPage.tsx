import { PageHeader } from '@/components/ui/page-header';
import { TripSummaryCard } from '@/components/ui/trip-summary-card';
import { BusInfoCard } from '@/components/ui/bus-info-card';
import { DriverInfoCard } from '@/components/ui/driver-info-card';

export function TodaysTripPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Today's Trip" 
        description="Live status of the current journey."
      />
      <div className="space-y-4">
        <TripSummaryCard 
          routeName="Morning Route A" 
          status="in_progress" 
          eta="08:10 AM" 
          progressPercentage={65} 
        />
        <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed my-4">
          Map / Stops list placeholder
        </div>
        <BusInfoCard busNumber="42" plate="XYZ-1234" color="Yellow" />
        <DriverInfoCard name="Michael Smith" phonePlaceholder="(555) 123-4567" />
      </div>
    </div>
  );
}
