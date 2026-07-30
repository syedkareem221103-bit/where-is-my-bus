import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 border-r hidden md:block">
        {/* Sidebar placeholder */}
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b flex items-center px-4">
          {/* Header placeholder */}
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
