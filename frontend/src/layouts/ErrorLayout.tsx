import { Outlet } from 'react-router-dom';

export function ErrorLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <Outlet />
    </div>
  );
}
