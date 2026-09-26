import { Redirect, Slot } from 'expo-router';
import { Platform } from 'react-native';

import { PlatformShell } from '@/features/platform/Shell';
import { useSession } from '@/state/session';
import { DensityContext } from '@/ui';

/** EduFlow team only (web): register schools and hand over their sign-ins. */
export default function PlatformLayout() {
  const user = useSession((s) => s.user);
  if (Platform.OS !== 'web' || !user?.platform) return <Redirect href="/" />;
  return (
    <DensityContext.Provider value="web">
      <PlatformShell>
        <Slot />
      </PlatformShell>
    </DensityContext.Provider>
  );
}
