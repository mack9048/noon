import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/guest', label: 'Home', icon: 'home-outline', match: ['/guest/ai', '/guest/audio', '/guest/tools'] },
  // Our Courses: Madrasa Support is one of the courses.
  { href: '/guest/courses', label: 'Courses', icon: 'school-outline', match: ['/guest/support', '/guest/demo-classes', '/guest/demo-course'] },
  { href: '/guest/games', label: 'Games', icon: 'game-controller-outline' },
  { href: '/guest/quran', label: 'Quran', icon: 'book-outline' },
  { href: '/guest/unlock', label: 'Unlock', icon: 'lock-open-outline', match: ['/guest/more'] },
];

export default function Layout() {
  return (
    <RoleGate roles={['guest']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
