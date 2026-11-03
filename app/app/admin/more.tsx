import React from 'react';
import { RoleMoreScreen } from '@/screens/more';
import { colors } from '@/theme/tokens';

export default function Page() {
  return (
    <RoleMoreScreen links={[
      ['Noon Courses', '/admin/courses', 'school-outline', colors.lav],
      ['Leave approvals', '/admin/leave', 'calendar-outline', colors.butter],
    ]} />
  );
}
