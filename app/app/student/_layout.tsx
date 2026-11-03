import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';
import { StudentMoreMenu } from '@/screens/more';

const items: NavItem[] = [
  { href: '/student', label: 'Home', icon: 'home-outline' },
  { href: '/student/classroom', label: 'Classroom', icon: 'book-outline', match: ['/student/learn', '/student/salah-report', '/student/report-pdf'] },
  { href: '/student/chat', label: 'Chat', icon: 'chatbubble-outline' },
  { href: '/student/games', label: 'Games', icon: 'game-controller-outline' },
  {
    href: '/student/more', label: 'More', icon: 'apps-outline',
    match: ['/student/leave', '/student/profile', '/student/fees', '/student/attendance', '/student/audio', '/student/settings', '/student/help'],
    sheet: (close) => <StudentMoreMenu onNavigate={close} />,
  },
];

export default function Layout() {
  return (
    <RoleGate roles={['student', 'parent']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
