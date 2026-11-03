import React from 'react';
import { Header, Screen } from '@/components/ui';
import { StudentMoreMenu } from '@/screens/more';

/** Tablet / desktop: More opens as a page. On phones the tab bar shows it as a pop-up instead. */
export default function More() {
  return (
    <Screen>
      <Header title="More" back={false} />
      <StudentMoreMenu />
    </Screen>
  );
}
