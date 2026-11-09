import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';
import { MoreMenu, SUPER_MORE } from '@/screens/more';

const items: NavItem[] = [
  { href: '/super', label: 'Overview', icon: 'grid-outline', match: ['/super/profile', '/super/settings', '/super/games'] },
  { href: '/super/tenants', label: 'Madrasas', icon: 'business-outline', match: ['/super/users'] },
  { href: '/super/content', label: 'Content', icon: 'albums-outline', match: ['/super/tools', '/super/courses', '/super/approvals'] },
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
