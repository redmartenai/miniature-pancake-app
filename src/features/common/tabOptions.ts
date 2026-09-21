import { Platform } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { fonts } from '@/theme/tokens';

export function tabScreenOptions(colors: Palette) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      // Each tab item needs 28px (icon) + 14px (label line); anything less and the web label
      // gets squeezed by flexbox and clips descenders ("Messages" loses its "g").
      ...(Platform.OS === 'web' ? { height: 68, paddingTop: 6, paddingBottom: 8 } : {}),
    },
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
    tabBarBadgeStyle: { backgroundColor: colors.accent, color: '#FFFFFF', fontSize: 10 },
    sceneStyle: { backgroundColor: colors.bg },
  };
}
