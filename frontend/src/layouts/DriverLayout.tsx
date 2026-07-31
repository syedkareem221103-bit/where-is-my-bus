import { Outlet } from 'react-router-dom';
import { DriverTopbar } from '@/components/layout/DriverTopbar';
import { DriverBottomNav } from '@/components/layout/DriverBottomNav';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export function DriverLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/20 pb-16 sm:pb-0">
      <OfflineBanner />
      <DriverTopbar />
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 overflow-x-hidden">
        <Outlet />
      </main>
      <DriverBottomNav />
    </div>
  );
}
