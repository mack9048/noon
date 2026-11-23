// Course Management paths: super admin uses /super/manage, institution admins and teachers /manage.
import { useAuth } from './auth';

export const manageApi = (role?: string) => (role === 'super' ? '/super/manage' : '/manage');
export const manageRoute = (role: string | undefined, courseId: number | string) => `/${role === 'super' ? 'super' : role === 'teacher' ? 'teacher' : 'admin'}/manage/${courseId}`;

export function useManage() {
  const { user } = useAuth();
  return { api: manageApi(user?.role), route: (id: number | string) => manageRoute(user?.role, id), role: user?.role };
}
