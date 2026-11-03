import React from 'react';
import { RoleMoreScreen } from '@/screens/more';
import { colors } from '@/theme/tokens';

export default function Page() {
  return (
    <RoleMoreScreen links={[
      ['Course & live class', '/teacher/course/1', 'videocam-outline', colors.pink],
      ['Review work', '/teacher/review', 'clipboard-outline', colors.sky],
      ['Assess Salah', '/teacher/assess', 'ribbon-outline', colors.mint],
      ['Leave approvals', '/teacher/leave', 'calendar-outline', colors.lav],
    ]} />
  );
}
