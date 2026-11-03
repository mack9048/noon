import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';
import { MoreMenu, SUPER_MORE } from '@/screens/more';

const items: NavItem[] = [
  { href: '/super', label: 'Overview', icon: 'grid-outline' },
  { href: '/super/tenants', label: 'Tenants', icon: 'business-outline' },
  { href: '/super/content', label: 'Content', icon: 'albums-outline', match: ['/super/tools', '/super/courses'] },
  { href: '/super/billing', label: 'Billing', icon: 'card-outline' },
  { href: '/super/more', label: 'More', icon: 'apps-outline', sheet: (close) => <MoreMenu links={SUPER_MORE} onNavigate={close} logout /> },
];

export default function Layout() {
  return (
    <RoleGate roles={['super']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
