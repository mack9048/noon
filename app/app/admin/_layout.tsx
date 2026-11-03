import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'grid-outline' },
  { href: '/admin/students', label: 'Students', icon: 'people-outline' },
  { href: '/admin/fees', label: 'Fees', icon: 'cash-outline', glyph: '₹' },
  { href: '/admin/teachers', label: 'Teachers', icon: 'school-outline' },
  { href: '/admin/more', label: 'More', icon: 'apps-outline', match: ['/admin/courses', '/admin/leave'] },
];

export default function Layout() {
  return (
    <RoleGate roles={['admin']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
