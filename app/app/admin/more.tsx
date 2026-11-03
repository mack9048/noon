import React from 'react';
import { RoleMoreScreen } from '@/screens/more';
import { colors } from '@/theme/tokens';

export default function Page() {
  return (
    <RoleMoreScreen links={[
      ['Attendance report', '/admin/attendance', 'stats-chart-outline', colors.mint],
      ['Bulk add', '/admin/bulk', 'cloud-upload-outline', colors.sky],
      ['Noon Courses', '/admin/courses', 'school-outline', colors.lav],
      ['Leave approvals', '/admin/leave', 'calendar-outline', colors.butter],
    ]} />
  );
}
