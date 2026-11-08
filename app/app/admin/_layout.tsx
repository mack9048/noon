import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';
import { MoreMenu, ADMIN_MORE } from '@/screens/more';

const items: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'grid-outline', match: ['/admin/attendance', '/admin/profile', '/admin/settings'] },
  { href: '/admin/students', label: 'Students', icon: 'people-outline', match: ['/admin/bulk', '/admin/admissions'] },
  { href: '/admin/fees', label: 'Fees', icon: 'cash-outline', glyph: '₹' },
  { href: '/admin/teachers', label: 'Teachers', icon: 'school-outline', match: ['/admin/batches'] },
  { href: '/admin/more', label: 'More', icon: 'apps-outline', match: ['/admin/courses', '/admin/leave'], sheet: (close) => <MoreMenu links={ADMIN_MORE} onNavigate={close} logout /> },
];

export default function Layout() {
  return (
    <RoleGate roles={['admin']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
