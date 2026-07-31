import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { GraduationCap } from 'lucide-react';

export function StudentsList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Students" 
        description="Manage student records and transport details."
        actionLabel="Add Student"
        onAction={() => console.log("Add Student clicked")}
      />
      <EmptyState 
        title="No students found"
        description="Get started by adding a new student."
        icon={GraduationCap}
        actionLabel="Add Student"
        onAction={() => console.log("Add Student clicked")}
      />
    </div>
  );
}
