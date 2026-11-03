import React from 'react';
import { MorePage, SUPER_MORE } from '@/screens/more';

/** Tablet / desktop: More opens as a page. On phones the tab bar shows it as a pop-up instead. */
export default function Page() {
  return <MorePage links={SUPER_MORE} logout />;
}
