import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/student', label: 'Home', icon: 'home-outline' },
  // "My Classroom" (design) opens courses + Madrasa Support until its own screen is built.
  { href: '/student/courses', label: 'Classroom', icon: 'book-outline', match: ['/student/support', '/student/tools'] },
  { href: '/student/chat', label: 'Chat', icon: 'chatbubble-outline' },
  { href: '/student/games', label: 'Games', icon: 'game-controller-outline' },
  { href: '/student/more', label: 'More', icon: 'apps-outline', match: ['/student/leave', '/student/quran'] },
];

export default function Layout() {
  return (
    <RoleGate roles={['student', 'parent']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
