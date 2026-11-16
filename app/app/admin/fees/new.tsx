import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AddFeesScreen } from '@/screens/fees';

export default function AddFees() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  return <AddFeesScreen month={month} />;
}
