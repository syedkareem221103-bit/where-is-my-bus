import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardList } from 'lucide-react';

export function DriverAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance Manifest" 
        description="Scan or manually log student boarding."
      />
      <EmptyState 
        title="No active trip"
        description="Start a trip to see the attendance manifest."
        icon={ClipboardList}
      />
    </div>
  );
}
