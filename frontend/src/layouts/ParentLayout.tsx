import { Outlet } from 'react-router-dom';
import { ParentTopbar } from '@/components/layout/ParentTopbar';
import { ParentBottomNav } from '@/components/layout/ParentBottomNav';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export function ParentLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/20 pb-16 sm:pb-0">
      <OfflineBanner />
      <ParentTopbar />
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 overflow-x-hidden">
        <Outlet />
      </main>
      <ParentBottomNav />
    </div>
  );
}
