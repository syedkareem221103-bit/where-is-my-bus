import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardList } from 'lucide-react';

export function ParentAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance History" 
        description="View past bus boarding and dropoff records."
      />
      <EmptyState 
        title="No attendance records"
        description="There are no recent attendance logs for your child."
        icon={ClipboardList}
      />
    </div>
  );
}
