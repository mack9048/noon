// Join the live class that is on now: Noon Live opens inside the app, Google Meet opens its link.
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { api } from './api';
import { demoNote } from '@/components/kit';
import { setLivePass, type LivePass } from '@/screens/liveRoom';

export async function joinLiveCourse(courseId: number) {
  try {
    const r = await api.post<{ provider: 'meet'; url: string } | LivePass>(`/courses/${courseId}/live/join`);
    if (r.provider === 'livekit') { setLivePass(r); router.push(`/live/${courseId}` as any); }
    else await Linking.openURL(r.url);
  } catch (e: any) { demoNote(e?.friendly ?? e?.message ?? 'Could not open the class.'); }
}
