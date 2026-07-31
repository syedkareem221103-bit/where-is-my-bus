import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Car, 
  Map, 
  MapPin,
  ClipboardList,
  FileText,
  Settings,
  AlertTriangle,
  UserSquare2,
  GraduationCap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[]; // If empty, all admin roles can see it
  group?: string;
}

export const adminNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    title: 'Organizations',
    href: '/admin/organizations',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
    group: 'Management',
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    group: 'Management',
  },
  {
    title: 'Drivers',
    href: '/admin/drivers',
    icon: UserSquare2,
    group: 'Management',
  },
  {
    title: 'Students',
    href: '/admin/students',
    icon: GraduationCap,
    group: 'Management',
  },
  {
    title: 'Parents',
    href: '/admin/parents',
    icon: Users,
    group: 'Management',
  },
  {
    title: 'Vehicles',
    href: '/admin/vehicles',
    icon: Car,
    group: 'Fleet & Operations',
  },
  {
    title: 'Routes',
    href: '/admin/routes',
    icon: Map,
    group: 'Fleet & Operations',
  },
  {
    title: 'Trips',
    href: '/admin/trips',
    icon: MapPin,
    group: 'Fleet & Operations',
  },
  {
    title: 'Attendance',
    href: '/admin/attendance',
    icon: ClipboardList,
    group: 'Fleet & Operations',
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: FileText,
    group: 'System',
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    group: 'System',
  },
  {
    title: 'Emergency',
    href: '/admin/emergency',
    icon: AlertTriangle,
    group: 'System',
  }
];
