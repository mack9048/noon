import React from 'react';
import { MorePage, STUDENT_MORE } from '@/screens/more';

/** Tablet / desktop: More opens as a page. On phones the tab bar shows it as a pop-up instead. */
export default function More() {
  return <MorePage links={STUDENT_MORE} profileHref="/student/profile" />;
}
