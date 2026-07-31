import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { DriverLayout } from '@/layouts/DriverLayout';
import { ParentLayout } from '@/layouts/ParentLayout';
import { ErrorLayout } from '@/layouts/ErrorLayout';

import { AuthGuard } from './guards/AuthGuard';
import { GuestGuard } from './guards/GuestGuard';
import { RoleGuard } from './guards/RoleGuard';

import { LoginPage } from '@/pages/auth/LoginPage';
import { LogoutPage } from '@/pages/auth/LogoutPage';
import { UnauthorizedPage } from '@/pages/error/UnauthorizedPage';
import { ForbiddenPage } from '@/pages/error/ForbiddenPage';

const router = createBrowserRouter([
  // Public / Guest Routes
  {
    element: <GuestGuard />,
    children: [
      {
        path: '/',
        element: <PublicLayout />,
        errorElement: <ErrorLayout />,
        children: [
          {
            index: true,
            element: <div>Welcome to Where is my Bus (Public Landing Placeholder)</div>,
          },
          {
            path: 'login',
            element: <LoginPage />,
          },
        ],
      },
    ],
  },

  // Auth Action Routes
  {
    path: 'logout',
    element: <LogoutPage />,
  },

  // Protected Routes
  {
    element: <AuthGuard />,
    children: [
      // Admin Routes
      {
        path: '/admin',
        element: <RoleGuard allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR']} />,
        children: [
          {
            element: <AdminLayout />,
            errorElement: <ErrorLayout />,
            children: [
              {
                index: true,
                element: <div>Admin Dashboard Placeholder</div>,
              },
            ],
          },
        ],
      },
      // Driver Routes
      {
        path: '/driver',
        element: <RoleGuard allowedRoles={['DRIVER']} />,
        children: [
          {
            element: <DriverLayout />,
            errorElement: <ErrorLayout />,
            children: [
              {
                index: true,
                element: <div>Driver Portal Placeholder</div>,
              },
            ],
          },
        ],
      },
      // Parent Routes
      {
        path: '/parent',
        element: <RoleGuard allowedRoles={['PARENT']} />,
        children: [
          {
            element: <ParentLayout />,
            errorElement: <ErrorLayout />,
            children: [
              {
                index: true,
                element: <div>Parent Portal Placeholder</div>,
              },
            ],
          },
        ],
      },
    ],
  },

  // Error Routes
  {
    path: '/unauthorized',
    element: <ErrorLayout />,
    children: [
      {
        index: true,
        element: <UnauthorizedPage />,
      }
    ],
  },
  {
    path: '/forbidden',
    element: <ErrorLayout />,
    children: [
      {
        index: true,
        element: <ForbiddenPage />,
      }
    ],
  },
  {
    path: '*',
    element: <ErrorLayout />,
    children: [
      {
        index: true,
        element: <div>404 Not Found</div>,
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
