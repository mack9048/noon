import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'grid' },
  { href: '/admin/courses', label: 'Courses', icon: 'school' },
  { href: '/admin/leave', label: 'Leave', icon: 'calendar' },
];

export default function Layout() {
  return (
    <RoleGate roles={['admin']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
