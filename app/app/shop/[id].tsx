import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ShopRedirect } from '@/screens/shop';

/** Link from the website to one product. */
export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShopRedirect id={id} />;
}
