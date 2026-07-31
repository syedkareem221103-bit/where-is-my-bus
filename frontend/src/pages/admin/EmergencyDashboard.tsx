import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertTriangle } from 'lucide-react';

export function EmergencyDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Emergency" 
        description="Monitor system alerts and trigger SOS protocols."
        actionLabel="Trigger SOS"
        onAction={() => console.log("Trigger SOS clicked")}
      />
      <EmptyState 
        title="No active emergencies"
        description="All systems are operating normally."
        icon={AlertTriangle}
      />
    </div>
  );
}
