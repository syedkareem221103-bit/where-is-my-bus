import { 
  LayoutDashboard, 
  MapPin, 
  UserCircle2,
  ClipboardList,
  Bell,
  AlertTriangle,
  User,
  Settings
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ParentNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const parentNavigation: ParentNavItem[] = [
  {
    title: 'Dashboard',
    href: '/parent',
    icon: LayoutDashboard,
  },
  {
    title: 'Trip',
    href: '/parent/trip',
    icon: MapPin,
  },
  {
    title: 'Child Info',
    href: '/parent/child',
    icon: UserCircle2,
  },
  {
    title: 'Attendance',
    href: '/parent/attendance',
    icon: ClipboardList,
  },
  {
    title: 'Notifications',
    href: '/parent/notifications',
    icon: Bell,
  },
  {
    title: 'Emergency',
    href: '/parent/emergency',
    icon: AlertTriangle,
  },
  {
    title: 'Profile',
    href: '/parent/profile',
    icon: User,
  },
  {
    title: 'Settings',
    href: '/parent/settings',
    icon: Settings,
  }
];
