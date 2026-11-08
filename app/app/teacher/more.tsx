import { Redirect } from 'expo-router';

/** The old More tab is now Tests; its links live on the profile page. */
export default function More() { return <Redirect href="/teacher/profile" />; }
