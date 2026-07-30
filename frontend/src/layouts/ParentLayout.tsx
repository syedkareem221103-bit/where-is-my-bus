import { Outlet } from 'react-router-dom';

export function ParentLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b flex items-center px-4">
        {/* Mobile Header placeholder */}
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
