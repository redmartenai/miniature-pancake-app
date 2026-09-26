import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { pastel as pastelColors, radius, spacing, type Palette, type Pastel } from '@/theme/tokens';

import { bgImage, cardShadow, pointer } from './css';

/**
 * What kind of surface a component sits on. Mirrors the CSS descendant rules
 * (`.w-* .pill`, `.hero .bar`, …): children restyle themselves inside pastel widgets and heroes.
 */
export type SurfaceKind = 'plain' | 'widget' | 'hero';
export type SurfaceInfo = { kind: SurfaceKind; ink?: string };

const SurfaceContext = createContext<SurfaceInfo>({ kind: 'plain' });

export function useSurface(): SurfaceInfo {
  return useContext(SurfaceContext);
}

export function SurfaceProvider({ value, children }: { value: SurfaceInfo; children: ReactNode }) {
  return <SurfaceContext.Provider value={value}>{children}</SurfaceContext.Provider>;
}

type Tint = 'brand' | 'ok' | 'warn' | 'bad' | 'info';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Legacy: 16px padding when true (default). Prefer `pad`. */
  padded?: boolean;
  /** Padding in px; `card-pad` is 22. */
  pad?: number;
  /** `card` (default), `flat` (`.card-flat`), `well` (`.well`). */
  variant?: 'card' | 'flat' | 'well';
  /** `.tint-*` backgrounds. */
  tint?: Tint;
  /** `.w-*` pastel widget. */
  pastel?: Pastel;
  /** `.stack`: a pile of sheets behind the card. */
  stack?: boolean;
  /** Legacy tones from the old kit. */
  tone?: 'surface' | 'primary' | 'soft';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
};

function tintColors(c: Palette, tint: Tint): { bg: string; border: string } {
  switch (tint) {
    case 'brand':
      return { bg: c.brandSoft, border: c.brandLine };
    case 'ok':
      return { bg: c.okSoft, border: 'transparent' };
    case 'warn':
      return { bg: c.warnSoft, border: 'transparent' };
    case 'bad':
      return { bg: c.badSoft, border: 'transparent' };
    default:
      return { bg: c.infoSoft, border: 'transparent' };
  }
}

export function stackShadow(c: Palette): string {
  return `0 7px 0 -4px ${c.surface}, 0 7px 0 -3px ${c.lineStrong}, 0 14px 0 -8px ${c.surface}, 0 14px 0 -7px ${c.line}`;
}

export function Card({
  children,
  onPress,
  style,
  padded = true,
  pad,
  variant = 'card',
  tint,
  pastel,
  stack,
  tone,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}: CardProps) {
  const { colors, scheme } = useTheme();
  const outer = useSurface();

  let bg = colors.surface;
  let border = colors.line;
  let shadow: ViewStyle | null = cardShadow(scheme);
  let r: number = radius.card;
  let surface: SurfaceInfo = { kind: 'plain' };

  if (variant === 'flat') {
    bg = colors.subtle;
    r = radius.cardFlat;
    shadow = null;
  } else if (variant === 'well') {
    bg = outer.kind === 'widget' ? colors.pTrack : colors.sunken;
    border = 'transparent';
    r = radius.well;
    shadow = null;
    surface = outer;
  }
  if (tone === 'primary') {
    bg = colors.brand;
    border = colors.brand;
  } else if (tone === 'soft') {
    bg = colors.brandSoft;
    border = colors.brandLine;
  }
  if (tint) {
    const t = tintColors(colors, tint);
    bg = t.bg;
    border = t.border;
    shadow = variant === 'card' ? shadow : null;
  }
  if (pastel) {
    const p = pastelColors(colors, pastel);
    bg = p.bg;
    border = 'transparent';
    shadow = null;
    surface = { kind: 'widget', ink: p.ink };
  }

  const padding = pad ?? (padded ? spacing.md : 0);
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: bg, borderColor: border, borderRadius: r, padding },
    variant === 'well' && { borderWidth: 0 },
    shadow,
    stack && { boxShadow: stackShadow(colors) },
    style,
  ];

  const body = <SurfaceProvider value={surface}>{children}</SurfaceProvider>;

  if (!onPress) {
    return (
      <View
        style={base}
        accessible={accessibilityLabel ? true : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [base, pointer, pressed && { opacity: 0.9 }]}>
      {body}
    </Pressable>
  );
}

/** `.well`: a sunken panel. */
export function Well({ children, style, pad = 14 }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  return (
    <Card variant="well" pad={pad} style={style}>
      {children}
    </Card>
  );
}

/**
 * `.hero`: the periwinkle card with an engraved grid ("rings") fading out from the centre.
 * `rings` positions the grid (default: right half).
 */
export function Hero({
  children,
  style,
  pad = 22,
  rings = { top: -40, right: -40, width: 320, height: 320 },
  radiusOverride,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pad?: number;
  rings?: ViewStyle | null;
  radiusOverride?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.hero, borderRadius: radiusOverride ?? radius.hero, padding: pad, overflow: 'hidden' },
        style,
      ]}>
      {rings ? (
        <View style={[{ pointerEvents: 'none' },{ position: 'absolute' }, rings]}>
          <View
            style={[
              StyleSheet.absoluteFill,
              bgImage(
                `linear-gradient(${colors.heroLine} 1px, transparent 1px), linear-gradient(90deg, ${colors.heroLine} 1px, transparent 1px)`,
                { size: '22px 22px' },
              ),
            ]}
          />
          {/* The CSS masks the grid with a radial fade; painting the hero colour over the edges looks the same. */}
          <View
            style={[
              StyleSheet.absoluteFill,
              bgImage(`radial-gradient(closest-side, transparent 25%, ${colors.hero} 100%)`),
            ]}
          />
        </View>
      ) : null}
      <SurfaceProvider value={{ kind: 'hero', ink: colors.onHero }}>{children}</SurfaceProvider>
    </View>
  );
}

/** `.hr` / `.vr`: hairline rules that pick up the surface they sit on. */
export function Hr({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const s = useSurface();
  const bg = s.kind === 'widget' ? colors.pHr : s.kind === 'hero' ? colors.heroLine : colors.line;
  return <View style={[{ height: 1, backgroundColor: bg, alignSelf: 'stretch' }, style]} />;
}

export function Vr({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const s = useSurface();
  const bg = s.kind === 'widget' ? colors.pHr : s.kind === 'hero' ? colors.heroLine : colors.line;
  return <View style={[{ width: 1, backgroundColor: bg, alignSelf: 'stretch' }, style]} />;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'visible' },
});
