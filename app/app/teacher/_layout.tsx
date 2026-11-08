import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

// Design: Home · Classes · Attendance · Chat · Tests
const items: NavItem[] = [
  { href: '/teacher', label: 'Home', icon: 'home-outline', match: ['/teacher/profile', '/teacher/settings', '/teacher/leave'] },
  { href: '/teacher/classes', label: 'Classes', icon: 'book-outline', match: ['/teacher/course', '/teacher/review', '/teacher/assess'] },
  { href: '/teacher/attendance', label: 'Attendance', icon: 'calendar-outline' },
  { href: '/teacher/chat', label: 'Chat', icon: 'chatbubble-outline' },
  { href: '/teacher/tests', label: 'Tests', icon: 'clipboard-outline' },
];

export default function Layout() {
  return (
    <RoleGate roles={['teacher']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
