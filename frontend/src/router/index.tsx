import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { DriverLayout } from '@/layouts/DriverLayout';
import { ParentLayout } from '@/layouts/ParentLayout';
import { ErrorLayout } from '@/layouts/ErrorLayout';

import { AuthGuard } from './guards/AuthGuard';
import { GuestGuard } from './guards/GuestGuard';
import { RoleGuard } from './guards/RoleGuard';

const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const LogoutPage = React.lazy(() => import('@/pages/auth/LogoutPage').then(m => ({ default: m.LogoutPage })));
const UnauthorizedPage = React.lazy(() => import('@/pages/error/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const ForbiddenPage = React.lazy(() => import('@/pages/error/ForbiddenPage').then(m => ({ default: m.ForbiddenPage })));

const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const OrganizationsList = React.lazy(() => import('@/pages/admin/OrganizationsList').then(m => ({ default: m.OrganizationsList })));
const UsersList = React.lazy(() => import('@/pages/admin/UsersList').then(m => ({ default: m.UsersList })));
const DriversList = React.lazy(() => import('@/pages/admin/DriversList').then(m => ({ default: m.DriversList })));
const StudentsList = React.lazy(() => import('@/pages/admin/StudentsList').then(m => ({ default: m.StudentsList })));
const ParentsList = React.lazy(() => import('@/pages/admin/ParentsList').then(m => ({ default: m.ParentsList })));
const VehiclesList = React.lazy(() => import('@/pages/admin/VehiclesList').then(m => ({ default: m.VehiclesList })));
const RoutesList = React.lazy(() => import('@/pages/admin/RoutesList').then(m => ({ default: m.RoutesList })));
const TripsList = React.lazy(() => import('@/pages/admin/TripsList').then(m => ({ default: m.TripsList })));
const AttendanceList = React.lazy(() => import('@/pages/admin/AttendanceList').then(m => ({ default: m.AttendanceList })));
const ReportsDashboard = React.lazy(() => import('@/pages/admin/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const AnalyticsDashboard = React.lazy(() => import('@/pages/admin/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const SettingsPage = React.lazy(() => import('@/pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })));
const EmergencyDashboard = React.lazy(() => import('@/pages/admin/EmergencyDashboard').then(m => ({ default: m.EmergencyDashboard })));

const DriverDashboard = React.lazy(() => import('@/pages/driver/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const TodaysRoutePage = React.lazy(() => import('@/pages/driver/TodaysRoutePage').then(m => ({ default: m.TodaysRoutePage })));
const TripHistoryPage = React.lazy(() => import('@/pages/driver/TripHistoryPage').then(m => ({ default: m.TripHistoryPage })));
const DriverAttendancePage = React.lazy(() => import('@/pages/driver/DriverAttendancePage').then(m => ({ default: m.DriverAttendancePage })));
const EmergencyActionPage = React.lazy(() => import('@/pages/driver/EmergencyActionPage').then(m => ({ default: m.EmergencyActionPage })));
const DriverProfilePage = React.lazy(() => import('@/pages/driver/DriverProfilePage').then(m => ({ default: m.DriverProfilePage })));
const DriverSettingsPage = React.lazy(() => import('@/pages/driver/DriverSettingsPage').then(m => ({ default: m.DriverSettingsPage })));

const ParentDashboard = React.lazy(() => import('@/pages/parent/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const TodaysTripPage = React.lazy(() => import('@/pages/parent/TodaysTripPage').then(m => ({ default: m.TodaysTripPage })));
const ChildInfoPage = React.lazy(() => import('@/pages/parent/ChildInfoPage').then(m => ({ default: m.ChildInfoPage })));
const ParentAttendancePage = React.lazy(() => import('@/pages/parent/ParentAttendancePage').then(m => ({ default: m.ParentAttendancePage })));
const NotificationsPage = React.lazy(() => import('@/pages/parent/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ParentEmergencyPage = React.lazy(() => import('@/pages/parent/ParentEmergencyPage').then(m => ({ default: m.ParentEmergencyPage })));
const ParentProfilePage = React.lazy(() => import('@/pages/parent/ParentProfilePage').then(m => ({ default: m.ParentProfilePage })));
const ParentSettingsPage = React.lazy(() => import('@/pages/parent/ParentSettingsPage').then(m => ({ default: m.ParentSettingsPage })));


const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const withSuspense = (Component: React.ComponentType) => React.createElement(
  Suspense, 
  { fallback: React.createElement(PageLoader) },
  React.createElement(Component)
);

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
            element: withSuspense(LoginPage),
          },
        ],
      },
    ],
  },

  // Auth Action Routes
  {
    path: 'logout',
    element: withSuspense(LogoutPage),
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
                element: withSuspense(AdminDashboard),
              },
              {
                path: 'organizations',
                element: <RoleGuard allowedRoles={['SUPER_ADMIN']} />,
                children: [
                  {
                    index: true,
                    element: withSuspense(OrganizationsList),
                  }
                ]
              },
              {
                path: 'users',
                element: withSuspense(UsersList),
              },
              {
                path: 'drivers',
                element: withSuspense(DriversList),
              },
              {
                path: 'students',
                element: withSuspense(StudentsList),
              },
              {
                path: 'parents',
                element: withSuspense(ParentsList),
              },
              {
                path: 'vehicles',
                element: withSuspense(VehiclesList),
              },
              {
                path: 'routes',
                element: withSuspense(RoutesList),
              },
              {
                path: 'trips',
                element: withSuspense(TripsList),
              },
              {
                path: 'attendance',
                element: withSuspense(AttendanceList),
              },
              {
                path: 'reports',
                element: withSuspense(ReportsDashboard),
              },
              {
                path: 'analytics',
                element: withSuspense(AnalyticsDashboard),
              },
              {
                path: 'settings',
                element: withSuspense(SettingsPage),
              },
              {
                path: 'emergency',
                element: withSuspense(EmergencyDashboard),
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
                element: withSuspense(DriverDashboard),
              },
              {
                path: 'route',
                element: withSuspense(TodaysRoutePage),
              },
              {
                path: 'trips',
                element: withSuspense(TripHistoryPage),
              },
              {
                path: 'attendance',
                element: withSuspense(DriverAttendancePage),
              },
              {
                path: 'emergency',
                element: withSuspense(EmergencyActionPage),
              },
              {
                path: 'profile',
                element: withSuspense(DriverProfilePage),
              },
              {
                path: 'settings',
                element: withSuspense(DriverSettingsPage),
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
                element: withSuspense(ParentDashboard),
              },
              {
                path: 'trip',
                element: withSuspense(TodaysTripPage),
              },
              {
                path: 'child',
                element: withSuspense(ChildInfoPage),
              },
              {
                path: 'attendance',
                element: withSuspense(ParentAttendancePage),
              },
              {
                path: 'notifications',
                element: withSuspense(NotificationsPage),
              },
              {
                path: 'emergency',
                element: withSuspense(ParentEmergencyPage),
              },
              {
                path: 'profile',
                element: withSuspense(ParentProfilePage),
              },
              {
                path: 'settings',
                element: withSuspense(ParentSettingsPage),
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
        element: withSuspense(UnauthorizedPage),
      }
    ],
  },
  {
    path: '/forbidden',
    element: <ErrorLayout />,
    children: [
      {
        index: true,
        element: withSuspense(ForbiddenPage),
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
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
