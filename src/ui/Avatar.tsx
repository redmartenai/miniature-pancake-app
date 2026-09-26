import { Children, type ReactElement } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, type Palette } from '@/theme/tokens';

import { Text } from './Text';

/** Avatar tones `t1`–`t6`: blue, pink, mint, lav, peach, butter. */
export type AvatarTone = 1 | 2 | 3 | 4 | 5 | 6;
type SizeName = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const SIZES: Record<SizeName, { box: number; font: number }> = {
  xs: { box: 24, font: 9.5 },
  sm: { box: 30, font: 11 },
  md: { box: 36, font: 13 },
  lg: { box: 48, font: 16 },
  xl: { box: 72, font: 24 },
  xxl: { box: 96, font: 32 },
};

function toneColors(c: Palette, tone: AvatarTone): { bg: string; fg: string } {
  switch (tone) {
    case 2:
      return { bg: c.pPink, fg: c.pPinkInk };
    case 3:
      return { bg: c.pMint, fg: c.pMintInk };
    case 4:
      return { bg: c.pLav, fg: c.pLavInk };
    case 5:
      return { bg: c.pPeach, fg: c.pPeachInk };
    case 6:
      return { bg: c.pButter, fg: c.pButterInk };
    default:
      return { bg: c.pBlue, fg: c.pBlueInk };
  }
}

export function toneFor(seed: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return ((hash % 6) + 1) as AvatarTone;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** `.av` (+ size, tone, `.sq`). `size` also accepts a pixel number for legacy callers. */
export function Avatar({
  initials,
  name,
  size = 'md',
  tone,
  seed,
  square,
  ring,
  style,
}: {
  initials?: string;
  name?: string;
  size?: SizeName | number;
  tone?: AvatarTone | string;
  seed?: string;
  square?: boolean;
  /** Box-shadow ring colour (used by stacks and fans). */
  ring?: { color: string; width: number };
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const text = initials ?? (name ? initialsOf(name) : '');
  const t: AvatarTone = typeof tone === 'number' ? tone : toneFor(seed ?? name ?? text);
  const { bg, fg } = toneColors(colors, t);
  const dim = typeof size === 'number' ? { box: size, font: size * 0.36 } : SIZES[size];
  return (
    <View
      accessible={false}
      style={[
        {
          width: dim.box,
          height: dim.box,
          borderRadius: square ? 14 : dim.box / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ring ? { boxShadow: `0 0 0 ${ring.width}px ${ring.color}` } : null,
        style,
      ]}>
      <Text rawColor={fg} style={{ fontFamily: fonts.bold, fontSize: dim.font, lineHeight: dim.font * 1.1, letterSpacing: dim.font * 0.01 }}>
        {text}
      </Text>
    </View>
  );
}

/** `.av-stack`: overlapping avatars with a surface ring. */
export function AvatarStack({ children, overlap = 5 }: { children: ReactElement<{ style?: StyleProp<ViewStyle> }>[] | ReactElement; overlap?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {Children.map(children, (child, i) => (
        <View style={{ marginLeft: i === 0 ? 0 : -overlap, borderRadius: 999, boxShadow: `0 0 0 2px ${colors.surface}` }}>{child}</View>
      ))}
    </View>
  );
}

/** `.fan`: the child switcher; later avatars shrink and tuck behind the first. */
export function AvatarFan({ people, size = 'lg' }: { people: { initials: string; tone?: AvatarTone }[]; size?: SizeName }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.map((p, i) => (
        <View
          key={p.initials + i}
          style={[
            { borderRadius: 999, boxShadow: `0 0 0 3px ${colors.canvas}` },
            i > 0 && { marginLeft: -14, transform: [{ scale: 0.82 }, { translateX: -2 }], opacity: 0.9 },
          ]}>
          <Avatar initials={p.initials} tone={p.tone ?? ((i % 6) + 1) as AvatarTone} size={size} />
        </View>
      ))}
    </View>
  );
}
