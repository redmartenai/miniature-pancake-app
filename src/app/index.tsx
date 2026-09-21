import { Redirect } from 'expo-router';

import { ROLE_EXPERIENCE, useSession } from '@/state/session';

/** Send people to the right part of the app for their role. */
export default function Index() {
  const status = useSession((s) => s.status);
  const role = useSession((s) => s.role);
  if (status !== 'signedIn' || !role) return <Redirect href="/welcome" />;
  const experience = ROLE_EXPERIENCE[role];
  if (experience === 'driver') return <Redirect href="/driver" />;
  if (experience === 'staff') return <Redirect href="/staff" />;
  return <Redirect href="/family" />;
}
