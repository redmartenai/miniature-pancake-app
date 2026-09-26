import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, type Palette } from '@/theme/tokens';

import { useSurface } from './Card';
import { pointer } from './css';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Text } from './Text';

export type FillTone = 'brand' | 'ok' | 'warn' | 'bad' | 'c1' | 'c2' | 'c3' | 'c4' | 'gold' | 'track';

export function fillColor(c: Palette, tone: FillTone): string {
  return tone === 'brand' ? c.brand : tone === 'gold' ? c.gold : c[tone];
}

/** `.bar` progress (+ `.thin`, `.thick`, fill tones). Picks up the widget / hero track automatically. */
export function Bar({
  value,
  max = 100,
  tone,
  color,
  size = 'md',
  style,
  accessibilityLabel,
}: {
  value: number;
  max?: number;
  tone?: FillTone;
  /** A raw fill colour (e.g. a pastel ink), when no tone fits. */
  color?: string;
  size?: 'thin' | 'md' | 'thick';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const surface = useSurface();
  const height = size === 'thin' ? 6 : size === 'thick' ? 10 : 8;
  const track = surface.kind === 'widget' ? colors.pTrack : surface.kind === 'hero' ? colors.heroWash : colors.track;
  const fill = color
    ? color
    : tone
      ? fillColor(colors, tone)
      : surface.kind === 'widget'
        ? (surface.ink ?? colors.brand)
        : surface.kind === 'hero'
          ? colors.gold
          : colors.brand;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: value }}
      style={[{ height, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999, backgroundColor: fill }} />
    </View>
  );
}

/** `.legend` with `.sw` swatches. */
export function Legend({
  items,
  style,
}: {
  items: { label: string; color: string; shape?: 'square' | 'dot' | 'ring' }[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.legend, style]}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View
            style={[
              { width: 10, height: 10, borderRadius: it.shape === 'square' || !it.shape ? 3 : 5 },
              it.shape === 'ring' ? { boxShadow: `inset 0 0 0 2px ${it.color}` } : { backgroundColor: it.color },
            ]}
          />
          <Text variant="xs" color="ink2" weight={600}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** `.delta.up/.down/.flat`. */
export function Delta({ value, direction, suffix = '' }: { value: string | number; direction: 'up' | 'down' | 'flat'; suffix?: string }) {
  const { colors } = useTheme();
  const color = direction === 'up' ? colors.ok : direction === 'down' ? colors.bad : colors.muted;
  return (
    <View style={styles.delta}>
      {direction !== 'flat' ? <Icon name={direction === 'up' ? 'trendUp' : 'trendDown'} size={ICON_SIZE.xs} rawColor={color} bold /> : null}
      <Text rawColor={color} style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 }}>
        {value}
        {suffix}
      </Text>
    </View>
  );
}

export type TileTone = 'brand' | 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'ink' | 'pink' | 'mint' | 'lav' | 'peach' | 'butter' | 'blue';

/** `.tile-ic` square icon tile (`sm` 32, `md` 40, `lg` 48). */
export function TileIcon({
  icon,
  tone = 'brand',
  size = 'md',
  style,
}: {
  icon: IconName;
  tone?: TileTone;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const surface = useSurface();
  const map: Record<TileTone, { bg: string; fg: string }> = {
    brand: { bg: colors.brandSoft, fg: colors.brandInk },
    ok: { bg: colors.okSoft, fg: colors.ok },
    warn: { bg: colors.warnSoft, fg: colors.warn },
    bad: { bg: colors.badSoft, fg: colors.bad },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: colors.sunken, fg: colors.ink2 },
    ink: { bg: colors.ink, fg: colors.canvas },
    pink: { bg: colors.pPink, fg: colors.pPinkInk },
    mint: { bg: colors.pMint, fg: colors.pMintInk },
    lav: { bg: colors.pLav, fg: colors.pLavInk },
    peach: { bg: colors.pPeach, fg: colors.pPeachInk },
    butter: { bg: colors.pButter, fg: colors.pButterInk },
    blue: { bg: colors.pBlue, fg: colors.pBlueInk },
  };
  let { bg, fg } = map[tone];
  if (surface.kind === 'widget') {
    bg = colors.surface;
    if (tone === 'brand') fg = surface.ink ?? fg;
  } else if (surface.kind === 'hero') {
    bg = colors.heroWash;
    fg = colors.onHero;
  }
  const box = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const r = size === 'sm' ? 10 : size === 'lg' ? 15 : 12;
  return (
    <View
      style={[{ width: box, height: box, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={icon} size={size === 'sm' ? ICON_SIZE.sm : size === 'lg' ? ICON_SIZE.lg : ICON_SIZE.md} rawColor={fg} />
    </View>
  );
}

/** `.kicker`: uppercase section label followed by a hairline. */
export function Kicker({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.kicker, style]}>
      <Text variant="kicker">{children}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      {right}
    </View>
  );
}

/** `.sec-head`: section title with an optional action on the right. */
export function SectionHead({
  title,
  action,
  meta,
  style,
}: {
  title: string;
  action?: ReactNode;
  meta?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.secHead, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 }}>
        <Text variant="secTitle" accessibilityRole="header">
          {title}
        </Text>
        {meta}
      </View>
      {action}
    </View>
  );
}

/** `.link`: brand text link with an optional trailing chevron. */
export function Link({
  label,
  onPress,
  icon = 'chevronRight',
  size = 13,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName | null;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={6} style={[styles.link, pointer]}>
      <Text rawColor={colors.brandInk} style={{ fontFamily: fonts.bold, fontSize: size, lineHeight: size + 4 }}>
        {label}
      </Text>
      {icon ? <Icon name={icon} size={ICON_SIZE.xs} rawColor={colors.brandInk} bold /> : null}
    </Pressable>
  );
}

/** `.kbd` keyboard hint. */
export function Kbd({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.kbd, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
      <Text rawColor={colors.muted} style={{ fontFamily: fonts.bold, fontSize: 11, lineHeight: 11 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingTop: 4, paddingHorizontal: 2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kbd: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
});
