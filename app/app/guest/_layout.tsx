import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/guest', label: 'Home', icon: 'home-outline' },
  { href: '/guest/support', label: 'Madrasa', icon: 'book-outline', match: ['/guest/tools'] },
  { href: '/guest/courses', label: 'Courses', icon: 'school-outline' },
  { href: '/guest/games', label: 'Games', icon: 'game-controller-outline' },
  { href: '/guest/more', label: 'More', icon: 'apps-outline', match: ['/guest/quran'] },
];

export default function Layout() {
  return (
    <RoleGate roles={['guest']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
