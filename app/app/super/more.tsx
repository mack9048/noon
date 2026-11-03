import React from 'react';
import { RoleMoreScreen } from '@/screens/more';
import { colors } from '@/theme/tokens';

export default function Page() {
  return (
    <RoleMoreScreen links={[
      ['Noon Courses', '/super/courses', 'school-outline', colors.lav],
      ['Study tools', '/super/tools', 'document-text-outline', colors.butter],
    ]} />
  );
}
