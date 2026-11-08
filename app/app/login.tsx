import { Redirect } from 'expo-router';
import { useAuth, homeFor } from '@/lib/auth';
import { Loading } from '@/components/ui';
import { LoginScreen } from '@/screens/auth';

// noonlearn.com/login is the app's front door (the website links here and the
// installed app opens here). Signed-in users go straight to their home.
export default function Login() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user && user.role !== 'guest') return <Redirect href={homeFor(user.role) as any} />;
  return <LoginScreen />;
}
