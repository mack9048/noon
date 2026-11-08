import { Redirect } from 'expo-router';

/** The old More page is now Explore. */
export default function More() { return <Redirect href="/student/explore" />; }
