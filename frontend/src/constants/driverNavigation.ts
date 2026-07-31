import { 
  LayoutDashboard, 
  Map, 
  MapPin,
  ClipboardList,
  AlertTriangle,
  User,
  Settings
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DriverNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const driverNavigation: DriverNavItem[] = [
  {
    title: 'Dashboard',
    href: '/driver',
    icon: LayoutDashboard,
  },
  {
    title: 'Route',
    href: '/driver/route',
    icon: Map,
  },
  {
    title: 'Trips',
    href: '/driver/trips',
    icon: MapPin,
  },
  {
    title: 'Attendance',
    href: '/driver/attendance',
    icon: ClipboardList,
  },
  {
    title: 'Emergency',
    href: '/driver/emergency',
    icon: AlertTriangle,
  },
  {
    title: 'Profile',
    href: '/driver/profile',
    icon: User,
  },
  {
    title: 'Settings',
    href: '/driver/settings',
    icon: Settings,
  }
];
