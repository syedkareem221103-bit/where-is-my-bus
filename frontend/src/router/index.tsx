import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { DriverLayout } from '@/layouts/DriverLayout';
import { ParentLayout } from '@/layouts/ParentLayout';
import { ErrorLayout } from '@/layouts/ErrorLayout';

// Placeholder Router Configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <ErrorLayout />,
    children: [
      {
        index: true,
        element: <div>Welcome to Where is my Bus</div>,
      },
      {
        path: 'login',
        element: <div>Login Page Placeholder</div>,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <ErrorLayout />,
    children: [
      {
        index: true,
        element: <div>Admin Dashboard Placeholder</div>,
      },
    ],
  },
  {
    path: '/driver',
    element: <DriverLayout />,
    errorElement: <ErrorLayout />,
    children: [
      {
        index: true,
        element: <div>Driver Portal Placeholder</div>,
      },
    ],
  },
  {
    path: '/parent',
    element: <ParentLayout />,
    errorElement: <ErrorLayout />,
    children: [
      {
        index: true,
        element: <div>Parent Portal Placeholder</div>,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
