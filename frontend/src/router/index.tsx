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

import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { OrganizationsList } from '@/pages/admin/OrganizationsList';
import { UsersList } from '@/pages/admin/UsersList';
import { DriversList } from '@/pages/admin/DriversList';
import { StudentsList } from '@/pages/admin/StudentsList';
import { ParentsList } from '@/pages/admin/ParentsList';
import { VehiclesList } from '@/pages/admin/VehiclesList';
import { RoutesList } from '@/pages/admin/RoutesList';
import { TripsList } from '@/pages/admin/TripsList';
import { AttendanceList } from '@/pages/admin/AttendanceList';
import { ReportsDashboard } from '@/pages/admin/ReportsDashboard';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { EmergencyDashboard } from '@/pages/admin/EmergencyDashboard';

import { DriverDashboard } from '@/pages/driver/DriverDashboard';
import { TodaysRoutePage } from '@/pages/driver/TodaysRoutePage';
import { TripHistoryPage } from '@/pages/driver/TripHistoryPage';
import { DriverAttendancePage } from '@/pages/driver/DriverAttendancePage';
import { EmergencyActionPage } from '@/pages/driver/EmergencyActionPage';
import { DriverProfilePage } from '@/pages/driver/DriverProfilePage';
import { DriverSettingsPage } from '@/pages/driver/DriverSettingsPage';

import { ParentDashboard } from '@/pages/parent/ParentDashboard';
import { TodaysTripPage } from '@/pages/parent/TodaysTripPage';
import { ChildInfoPage } from '@/pages/parent/ChildInfoPage';
import { ParentAttendancePage } from '@/pages/parent/ParentAttendancePage';
import { NotificationsPage } from '@/pages/parent/NotificationsPage';
import { ParentEmergencyPage } from '@/pages/parent/ParentEmergencyPage';
import { ParentProfilePage } from '@/pages/parent/ParentProfilePage';
import { ParentSettingsPage } from '@/pages/parent/ParentSettingsPage';

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
                element: <AdminDashboard />,
              },
              {
                path: 'organizations',
                element: <RoleGuard allowedRoles={['SUPER_ADMIN']} />,
                children: [
                  {
                    index: true,
                    element: <OrganizationsList />,
                  }
                ]
              },
              {
                path: 'users',
                element: <UsersList />,
              },
              {
                path: 'drivers',
                element: <DriversList />,
              },
              {
                path: 'students',
                element: <StudentsList />,
              },
              {
                path: 'parents',
                element: <ParentsList />,
              },
              {
                path: 'vehicles',
                element: <VehiclesList />,
              },
              {
                path: 'routes',
                element: <RoutesList />,
              },
              {
                path: 'trips',
                element: <TripsList />,
              },
              {
                path: 'attendance',
                element: <AttendanceList />,
              },
              {
                path: 'reports',
                element: <ReportsDashboard />,
              },
              {
                path: 'settings',
                element: <SettingsPage />,
              },
              {
                path: 'emergency',
                element: <EmergencyDashboard />,
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
                element: <DriverDashboard />,
              },
              {
                path: 'route',
                element: <TodaysRoutePage />,
              },
              {
                path: 'trips',
                element: <TripHistoryPage />,
              },
              {
                path: 'attendance',
                element: <DriverAttendancePage />,
              },
              {
                path: 'emergency',
                element: <EmergencyActionPage />,
              },
              {
                path: 'profile',
                element: <DriverProfilePage />,
              },
              {
                path: 'settings',
                element: <DriverSettingsPage />,
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
                element: <ParentDashboard />,
              },
              {
                path: 'trip',
                element: <TodaysTripPage />,
              },
              {
                path: 'child',
                element: <ChildInfoPage />,
              },
              {
                path: 'attendance',
                element: <ParentAttendancePage />,
              },
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              {
                path: 'emergency',
                element: <ParentEmergencyPage />,
              },
              {
                path: 'profile',
                element: <ParentProfilePage />,
              },
              {
                path: 'settings',
                element: <ParentSettingsPage />,
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
