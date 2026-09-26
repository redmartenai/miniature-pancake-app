import { Redirect } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';

import { ROLE_EXPERIENCE, useSession } from '@/state/session';

/** Send people to the right part of the app for their role. */
export default function Index() {
  const status = useSession((s) => s.status);
  const role = useSession((s) => s.role);
  const user = useSession((s) => s.user);
  const { width } = useWindowDimensions();
  if (status === 'signedIn' && user?.must_change_password) return <Redirect href="/set-password" />;
  if (status === 'signedIn' && !role && user?.platform) return <Redirect href={'/platform' as never} />;
  if (status !== 'signedIn' || !role) {
    // A desktop browser is almost always the Principal web app; phones get the one-tap OTP sign-in.
    return <Redirect href={Platform.OS === 'web' && width >= 1024 ? '/sign-in' : '/login'} />;
  }
  const experience = ROLE_EXPERIENCE[role];
  if (experience === 'driver') return <Redirect href="/driver" />;
  if (experience === 'staff') return <Redirect href="/staff" />;
  if (experience === 'principal') return <Redirect href={Platform.OS === 'web' && width >= 1024 ? '/console' : '/principal'} />;
  if (experience === 'student') return <Redirect href="/student" />;
  return <Redirect href="/parent" />;
}
