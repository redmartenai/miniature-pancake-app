import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 20,
  color,
  rawColor,
}: {
  name: IconName;
  size?: number;
  color?: keyof Palette;
  rawColor?: string;
}) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={rawColor ?? colors[color ?? 'text']} />;
}
