import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  BarChart3,
  Users,
  Settings,
  Bell,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Roles allowed to see this item; omit = everyone. */
  roles?: UserRole[];
  /** Show in the mobile bottom bar. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { to: '/clients', label: 'Clients', icon: Building2, mobile: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, mobile: true },
  { to: '/audits', label: 'Audits', icon: ClipboardCheck, mobile: true },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/reports', label: 'Reports', icon: BarChart3, mobile: true },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['partner'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['partner'] },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}
