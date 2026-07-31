import { PageHeader } from '@/components/ui/page-header';
import { RouteCard } from '@/components/ui/route-card';

export function TodaysRoutePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Today's Route" 
        description="Details for your currently assigned route."
      />
      <RouteCard 
        routeName="Morning Route A (North)" 
        startLocation="Main Depot" 
        endLocation="City High School" 
        estimatedTime="07:00 AM - 08:30 AM"
        isActive={true}
      />
      <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">
        Map / Stops list placeholder
      </div>
    </div>
  );
}
