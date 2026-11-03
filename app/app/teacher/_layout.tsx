import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

const items: NavItem[] = [
  { href: '/teacher', label: 'Home', icon: 'home' },
  { href: '/teacher/course/1', label: 'Course', icon: 'school', match: ['/teacher/course'] },
  { href: '/teacher/leave', label: 'Leave', icon: 'calendar' },
  { href: '/teacher/chat', label: 'Chat', icon: 'chatbubbles' },
];

export default function Layout() {
  return (
    <RoleGate roles={['teacher']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
