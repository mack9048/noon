import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/guest', label: 'Home', icon: 'home-outline', match: ['/guest/quran', '/guest/ai', '/guest/audio', '/guest/tools'] },
  { href: '/guest/demo-classes', label: 'Madrasa', icon: 'book-outline', match: ['/guest/support'] },
  { href: '/guest/demo-course', label: 'Courses', icon: 'school-outline', match: ['/guest/courses'] },
  { href: '/guest/games', label: 'Games', icon: 'game-controller-outline' },
  { href: '/guest/unlock', label: 'Unlock', icon: 'lock-open-outline', match: ['/guest/more'] },
];

export default function Layout() {
  return (
    <RoleGate roles={['guest']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
