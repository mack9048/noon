import React from 'react';
import { RoleMoreScreen } from '@/screens/more';
import { colors } from '@/theme/tokens';

export default function Page() {
  return (
    <RoleMoreScreen links={[
      ['Course & live class', '/teacher/course/1', 'videocam-outline', colors.pink],
      ['Leave approvals', '/teacher/leave', 'calendar-outline', colors.lav],
    ]} />
  );
}
