import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/super', label: 'Overview', icon: 'grid-outline' },
  { href: '/super/tenants', label: 'Tenants', icon: 'business-outline' },
  { href: '/super/courses', label: 'Content', icon: 'albums-outline', match: ['/super/tools'] },
  { href: '/super/billing', label: 'Billing', icon: 'card-outline' },
  { href: '/super/more', label: 'More', icon: 'apps-outline' },
];

export default function Layout() {
  return (
    <RoleGate roles={['super']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
