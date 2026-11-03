import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/super', label: 'Overview', icon: 'speedometer' },
  { href: '/super/courses', label: 'Courses', icon: 'school' },
  { href: '/super/tools', label: 'Study tools', icon: 'document-text' },
];

export default function Layout() {
  return (
    <RoleGate roles={['super']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
