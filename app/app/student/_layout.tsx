import React from 'react';
import { AppShell, NavItem } from '@/components/AppShell';
import { RoleGate } from '@/components/RoleGate';

// Design: Classroom · Campus · Chat · Profile · Explore (Campus is the home page).
const items: NavItem[] = [
  { href: '/student/classroom', label: 'Classroom', icon: 'book-outline', match: ['/student/learn', '/student/class-done', '/student/live', '/student/pdf'] },
  { href: '/student', label: 'Campus', icon: 'business-outline', match: ['/student/courses', '/student/support', '/student/noon-buds', '/student/ai'] },
  { href: '/student/chat', label: 'Chat', icon: 'chatbubble-outline' },
  { href: '/student/profile', label: 'Profile', icon: 'person-outline',
    match: ['/student/bio', '/student/performance', '/student/attendance', '/student/fees', '/student/settings', '/student/help', '/student/leave', '/student/salah-report', '/student/report-pdf'] },
  { href: '/student/explore', label: 'Explore', icon: 'grid-outline', match: ['/student/games', '/student/audio', '/student/quran', '/student/tools', '/student/more'] },
];

export default function Layout() {
  return (
    <RoleGate roles={['student', 'parent']}>
      <AppShell items={items} />
    </RoleGate>
  );
}
