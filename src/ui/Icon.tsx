import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/tokens';

import { ICONS, type IconName as DesignIconName } from './icons/paths';

type IonName = ComponentProps<typeof Ionicons>['name'];

/** Design icons by name; Ionicons names still work for screens not yet redesigned (and the driver app). */
export type IconName = DesignIconName | IonName;

/** Sizes from eduflow.css: ic-xs 14, ic-sm 16, ic 18, dock 20, ic-lg 22, ic-xl 26. */
export const ICON_SIZE = { xs: 14, sm: 16, md: 18, dock: 20, lg: 22, xl: 26 } as const;

export function isDesignIcon(name: IconName): name is DesignIconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

export function Icon({
  name,
  size = ICON_SIZE.md,
  color,
  rawColor,
  bold,
}: {
  name: IconName;
  size?: number;
  color?: keyof Palette;
  rawColor?: string;
  /** `.ic-bold`: stroke 2.1 instead of 1.75. */
  bold?: boolean;
}) {
  const { colors } = useTheme();
  const tint = rawColor ?? colors[color ?? 'ink2'];
  if (!isDesignIcon(name)) return <Ionicons name={name} size={size} color={tint} />;

  const stroke = { stroke: tint, strokeWidth: bold ? 2.1 : 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const filled = { fill: tint, stroke: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ pointerEvents: 'none' }}>
      {ICONS[name].map((part, i) => {
        const paint = 'fill' in part && part.fill ? filled : stroke;
        switch (part.t) {
          case 'path':
            return <Path key={i} d={part.d} {...paint} />;
          case 'circle':
            return <Circle key={i} cx={part.cx} cy={part.cy} r={part.r} {...paint} />;
          case 'rect':
            return <Rect key={i} x={part.x} y={part.y} width={part.width} height={part.height} rx={part.rx} {...paint} />;
        }
      })}
    </Svg>
  );
}
