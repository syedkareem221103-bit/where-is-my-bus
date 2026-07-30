import { Outlet } from 'react-router-dom';

export function DriverLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <main className="flex-1 relative">
        <Outlet />
      </main>
      <nav className="h-16 border-t flex items-center justify-around">
        {/* Bottom nav placeholder */}
      </nav>
    </div>
  );
}
