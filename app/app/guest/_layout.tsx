import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/guest', label: 'Home', icon: 'home' },
  { href: '/guest/support', label: 'Madrasa', icon: 'library', match: ['/guest/tools'] },
  { href: '/guest/courses', label: 'Courses', icon: 'school' },
  { href: '/guest/games', label: 'Games', icon: 'game-controller' },
];

export default function Layout() {
  return (
    <RoleGate roles={['guest']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
