import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Bell } from 'lucide-react';

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Notifications" 
        description="Important alerts and updates about your child's transit."
      />
      <EmptyState 
        title="All caught up!"
        description="You have no new notifications."
        icon={Bell}
      />
    </div>
  );
}
