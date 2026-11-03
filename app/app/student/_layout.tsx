import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/student', label: 'Home', icon: 'home' },
  { href: '/student/courses', label: 'Courses', icon: 'school', match: ['/student/support', '/student/tools'] },
  { href: '/student/chat', label: 'Chat', icon: 'chatbubbles' },
  { href: '/student/games', label: 'Games', icon: 'game-controller' },
  { href: '/student/more', label: 'More', icon: 'grid', match: ['/student/leave'] },
];

export default function Layout() {
  return (
    <RoleGate roles={['student', 'parent']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
