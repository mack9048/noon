import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';
import { MoreMenu, TEACHER_MORE } from '@/screens/more';

const items: NavItem[] = [
  { href: '/teacher', label: 'Home', icon: 'home-outline' },
  { href: '/teacher/classes', label: 'Classes', icon: 'book-outline', match: ['/teacher/course', '/teacher/review', '/teacher/assess'] },
  { href: '/teacher/attendance', label: 'Attendance', icon: 'calendar-outline' },
  { href: '/teacher/chat', label: 'Chat', icon: 'chatbubble-outline' },
  { href: '/teacher/more', label: 'More', icon: 'apps-outline', match: ['/teacher/leave'], sheet: (close) => <MoreMenu links={TEACHER_MORE} onNavigate={close} logout /> },
];

export default function Layout() {
  return (
    <RoleGate roles={['teacher']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
