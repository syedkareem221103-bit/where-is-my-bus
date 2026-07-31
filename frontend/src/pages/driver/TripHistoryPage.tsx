import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { MapPin } from 'lucide-react';

export function TripHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Trip History" 
        description="Your past and upcoming trips."
      />
      <EmptyState 
        title="No trip history"
        description="You have not completed any trips yet."
        icon={MapPin}
      />
    </div>
  );
}
