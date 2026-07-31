import { PageHeader } from '@/components/ui/page-header';
import { ChildInfoCard } from '@/components/ui/child-info-card';

export function ChildInfoPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Child Information" 
      />
      <ChildInfoCard name="John Doe" grade="5th Grade" assignedRoute="Morning Route A (North)" />
      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
        Additional child profile details, emergency medical info, or authorized pickups placeholder.
      </div>
    </div>
  );
}
