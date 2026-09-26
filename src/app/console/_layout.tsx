import { Redirect, Slot } from 'expo-router';
import { Platform } from 'react-native';

import { ConsoleShell } from '@/features/console/Shell';
import { DensityContext } from '@/ui';
import { useExperience } from '@/state/session';

/** The principal's web console: sidebar + top bar around every /console page. Web only. */
export default function ConsoleLayout() {
  const experience = useExperience();
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  if (experience && experience !== 'principal') return <Redirect href="/" />;
  return (
    <DensityContext.Provider value="web">
      <ConsoleShell>
        <Slot />
      </ConsoleShell>
    </DensityContext.Provider>
  );
}
