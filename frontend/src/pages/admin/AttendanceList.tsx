import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardList } from 'lucide-react';

export function AttendanceList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance Logs" 
        description="View student boarding and alighting logs."
      />
      <EmptyState 
        title="No attendance records"
        description="Records will appear here once trips are active."
        icon={ClipboardList}
      />
    </div>
  );
}
