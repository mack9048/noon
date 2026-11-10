import React from 'react';
import { RoleGate } from '@/components/RoleGate';
import { ChangePasswordScreen } from '@/screens/passwords';

export default function Page() {
  return <RoleGate roles={['student', 'parent', 'teacher', 'admin', 'super']}><ChangePasswordScreen /></RoleGate>;
}
