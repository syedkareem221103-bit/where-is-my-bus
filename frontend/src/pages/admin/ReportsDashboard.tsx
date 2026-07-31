import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

export function ReportsDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports" 
        description="Generate and view system reports."
        actionLabel="Generate Report"
        onAction={() => console.log("Generate Report clicked")}
      />
      <EmptyState 
        title="No reports generated"
        description="Select a report type to generate."
        icon={FileText}
      />
    </div>
  );
}
