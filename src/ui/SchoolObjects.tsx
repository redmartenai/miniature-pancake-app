/**
 * "School objects": the stationery-inspired pieces of the Ink & Paper design
 * (eduflow.css → tearcal, ticket/tear, stamp, note, diary, paper, register dots, ribbon,
 * heat cells, route line, highlighter, chat bubbles).
 */
import type { ReactNode } from 'react';
import { Platform, Text as RNText, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, pastel as pastelColors, type Palette, type Pastel } from '@/theme/tokens';

import { SurfaceProvider, useSurface } from './Card';
import { bgImage } from './css';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Text } from './Text';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ------------------------------------------------------------------ tearcal */

/** `.tearcal`: tear-off calendar block. Pass a Date, or month/day/dow strings. */
export function TearCal({
  date,
  month,
  day,
  dow,
  size = 'md',
  headColor,
  style,
}: {
  date?: Date;
  month?: string;
  day?: string | number;
  dow?: string;
  size?: 'sm' | 'md';
  /** Month band colour; pink-ink by default. */
  headColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const sm = size === 'sm';
  const m = month ?? (date ? MONTHS[date.getMonth()] : '');
  const d = day ?? (date ? date.getDate() : '');
  const w = dow ?? (date ? (sm ? DAYS[date.getDay()].slice(0, 3) : DAYS[date.getDay()]) : '');
  return (
    <View
      accessible
      accessibilityLabel={`${w} ${d} ${m}`}
      style={[
        {
          width: sm ? 52 : 88,
          borderRadius: sm ? 10 : 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.lineStrong,
          alignItems: 'stretch',
          boxShadow: `0 2px 0 -1px ${colors.surface}, 0 3px 0 -1px ${colors.lineStrong}, 0 5px 0 -2px ${colors.surface}, 0 6px 0 -2px ${colors.line}`,
        },
        style,
      ]}>
      <View
        style={{
          backgroundColor: headColor ?? colors.pPinkInk,
          paddingTop: sm ? 8 : 14,
          paddingBottom: sm ? 4 : 7,
          borderTopLeftRadius: sm ? 9 : 13,
          borderTopRightRadius: sm ? 9 : 13,
          alignItems: 'center',
        }}>
        {!sm ? (
          <View style={styles.holes}>
            {[0, 1].map((i) => (
              <View key={i} style={[styles.hole, { backgroundColor: colors.surface }]} />
            ))}
          </View>
        ) : null}
        <Text
          rawColor={colors.surface}
          style={{
            fontFamily: fonts.extrabold,
            fontSize: sm ? 9 : 11,
            lineHeight: sm ? 9 : 11,
            letterSpacing: (sm ? 9 : 11) * (sm ? 0.12 : 0.16),
            textTransform: 'uppercase',
          }}>
          {m}
        </Text>
      </View>
      <Text
        align="center"
        rawColor={colors.ink}
        style={{
          fontFamily: fonts.display,
          fontSize: sm ? 22 : 42,
          lineHeight: sm ? 22 : 42,
          letterSpacing: (sm ? 22 : 42) * -0.045,
          paddingTop: sm ? 5 : 9,
          paddingBottom: sm ? 1 : 2,
        }}>
        {d}
      </Text>
      <Text
        align="center"
        rawColor={colors.muted}
        numberOfLines={1}
        style={{
          fontFamily: fonts.bold,
          fontSize: sm ? 9 : 10.5,
          lineHeight: sm ? 9 : 10.5,
          letterSpacing: (sm ? 9 : 10.5) * 0.12,
          textTransform: 'uppercase',
          paddingBottom: sm ? 6 : 11,
        }}>
        {w}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------- ticket */

type TicketColor = 'butter' | 'sky' | 'pink' | 'mint' | 'peach' | 'lav';

function ticketPastel(c: Palette, color: TicketColor): { bg: string; ink: string } {
  return pastelColors(c, color === 'sky' ? 'blue' : color);
}

/** `.ticket`: a pass / fee slip. Compose with `<Tear />` or `<TearV />` for the perforation. */
export function Ticket({ children, color = 'butter', style }: { children: ReactNode; color?: TicketColor; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const p = ticketPastel(colors, color);
  return (
    <View style={[{ borderRadius: 18, backgroundColor: p.bg }, style]}>
      <SurfaceProvider value={{ kind: 'widget', ink: p.ink }}>{children}</SurfaceProvider>
    </View>
  );
}

function Dashes({ vertical, color }: { vertical?: boolean; color: string }) {
  return (
    <Svg
      width={vertical ? 2 : '100%'}
      height={vertical ? '100%' : 2}
      style={vertical ? { position: 'absolute', left: 8, top: 16, bottom: 16 } : { position: 'absolute', left: 16, right: 16, top: 8 }}>
      <Line
        x1={vertical ? 1 : 0}
        y1={vertical ? 0 : 1}
        x2={vertical ? 1 : '100%'}
        y2={vertical ? '100%' : 1}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
    </Svg>
  );
}

/** `.tear`: horizontal perforation with punched notches (`onCard` when the ticket sits on a card). */
export function Tear({ onCard }: { onCard?: boolean }) {
  const { colors } = useTheme();
  const notch = onCard ? colors.surface : colors.canvas;
  return (
    <View style={{ height: 18, justifyContent: 'center' }} accessible={false}>
      <View style={[styles.notch, { left: -9, backgroundColor: notch }]} />
      <View style={[styles.notch, { right: -9, backgroundColor: notch }]} />
      <View style={{ position: 'absolute', left: 16, right: 16, top: 8, height: 2 }}>
        <Dashes color={colors.tear} />
      </View>
    </View>
  );
}

/** `.tear-v`: vertical perforation. */
export function TearV({ onCard }: { onCard?: boolean }) {
  const { colors } = useTheme();
  const notch = onCard ? colors.surface : colors.canvas;
  return (
    <View style={{ width: 18, alignSelf: 'stretch' }} accessible={false}>
      <View style={[styles.notchV, { top: -9, backgroundColor: notch }]} />
      <View style={[styles.notchV, { bottom: -9, backgroundColor: notch }]} />
      <View style={{ position: 'absolute', top: 16, bottom: 16, left: 8, width: 2 }}>
        <Svg width={2} height="100%">
          <Line x1={1} y1={0} x2={1} y2="100%" stroke={colors.tear} strokeWidth={2} strokeDasharray="6 4" />
        </Svg>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------- stamp */

export type StampTone = 'ok' | 'bad' | 'brand' | 'pink' | 'lav' | 'warn';

/** `.stamp`: a rubber stamp rotated -7°. `round` for grade stamps (66px circle). */
export function Stamp({
  children,
  sub,
  tone = 'ok',
  round,
  rotate = -7,
  style,
  textStyle,
}: {
  children: string;
  /** Second line for round stamps (e.g. "Grade"). */
  sub?: string;
  tone?: StampTone;
  round?: boolean;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const surface = useSurface();
  const color = {
    ok: colors.ok,
    bad: colors.bad,
    brand: colors.brandInk,
    pink: colors.pPinkInk,
    lav: colors.pLavInk,
    warn: colors.warn,
  }[tone];
  const gap = surface.kind === 'plain' ? colors.surface : 'transparent';
  return (
    <View
      accessible
      accessibilityLabel={sub ? `${children} ${sub}` : children}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          boxShadow: `inset 0 0 0 2px ${color}, inset 0 0 0 4px ${gap}, inset 0 0 0 5px ${color}`,
          transform: [{ rotate: `${rotate}deg` }],
        },
        round
          ? { width: 66, height: 66, borderRadius: 33, gap: 2 }
          : {
              flexDirection: 'row',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
            },
        style,
      ]}>
      <Text
        rawColor={color}
        style={[
          {
            fontFamily: fonts.extrabold,
            fontSize: round && children.length <= 3 ? 20 : 11.5,
            lineHeight: round && children.length <= 3 ? 20 : 12,
            letterSpacing: 11.5 * (round ? 0.08 : 0.16),
            textTransform: 'uppercase',
          },
          textStyle,
        ]}>
        {children}
      </Text>
      {sub ? (
        <Text
          rawColor={color}
          style={{
            fontFamily: fonts.extrabold,
            fontSize: 8.5,
            lineHeight: 9,
            letterSpacing: 0.7,
            textTransform: 'uppercase',
          }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------------- note */

type NoteColor = 'butter' | 'pink' | 'mint' | 'sky' | 'lav' | 'peach';

/** `.note`: sticky note with optional washi tape or push-pin, and a slight tilt. */
export function StickyNote({
  children,
  color = 'butter',
  tilt,
  tape,
  pin,
  style,
}: {
  children: ReactNode;
  color?: NoteColor;
  tilt?: 'l' | 'r';
  tape?: 'center' | 'right';
  pin?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, scheme } = useTheme();
  const p = pastelColors(colors, (color === 'sky' ? 'blue' : color) as Pastel);
  return (
    <View
      style={[
        {
          backgroundColor: p.bg,
          paddingTop: 24,
          paddingHorizontal: 18,
          paddingBottom: 16,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          borderBottomRightRadius: 16,
          borderBottomLeftRadius: 3,
          boxShadow:
            scheme === 'dark' ? '0 14px 24px -18px rgba(0,0,0,0.8)' : '0 1px 0 rgba(28,27,34,0.04), 0 14px 24px -18px rgba(40,32,20,0.35)',
        },
        tilt === 'l' && { transform: [{ rotate: '-1.4deg' }] },
        tilt === 'r' && { transform: [{ rotate: '1.1deg' }] },
        style,
      ]}>
      {tape ? (
        <View
          style={[
            { pointerEvents: 'none' },
            {
              position: 'absolute',
              top: -11,
              height: 22,
              backgroundColor: colors.tape,
              boxShadow: '0 1px 2px rgba(20,26,46,0.10)',
            },
            tape === 'center'
              ? {
                  left: '50%',
                  width: 78,
                  marginLeft: -39,
                  transform: [{ rotate: '-3deg' }],
                }
              : { right: 18, width: 58, transform: [{ rotate: '6deg' }] },
          ]}
        />
      ) : null}
      {pin ? (
        <View
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            top: 10,
            left: '50%',
            width: 14,
            height: 14,
            marginLeft: -7,
            borderRadius: 7,
            backgroundColor: colors.pPinkInk,
            boxShadow: '0 2px 3px rgba(20,26,46,0.25), inset -2px -2px 0 rgba(0,0,0,0.15)',
          }}
        />
      ) : null}
      <SurfaceProvider value={{ kind: 'widget', ink: p.ink }}>{children}</SurfaceProvider>
    </View>
  );
}

/* -------------------------------------------------------------------- diary */

/** `.diary`: ruled page with a terracotta margin line. Put `DiaryHead` and `DiaryRow`s inside. */
export function Diary({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 14,
          overflow: 'hidden',
        },
        style,
      ]}>
      <View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 46,
          width: 1,
          backgroundColor: colors.marginLine,
        }}
      />
      {children}
    </View>
  );
}

export function DiaryHead({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.diaryHead, { borderBottomColor: colors.rule, backgroundColor: colors.surface }]}>{children}</View>;
}

/** One ruled line. `when` is the pink day label in the margin ("Wed"). */
export function DiaryRow({
  when,
  whenColor,
  children,
  last,
  style,
}: {
  when?: string;
  /** Margin label colour (today is brand-coloured). */
  whenColor?: string;
  children: ReactNode;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.diaryRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.rule }, style]}>
      {when ? (
        <Text
          align="center"
          rawColor={whenColor ?? colors.pPinkInk}
          style={{
            position: 'absolute',
            left: 6,
            width: 36,
            fontFamily: fonts.bold,
            fontSize: 10,
            lineHeight: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}>
          {when}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/* -------------------------------------------------------------------- paper */

/** `.paper`: a sheet with two more sheets peeking out underneath. */
export function Paper({ children, style, pad = 18 }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.lineStrong,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          padding: pad,
          marginBottom: 10,
          boxShadow: `0 5px 0 -2px ${colors.surface}, 0 5px 0 -1px ${colors.lineStrong}, 0 10px 0 -5px ${colors.surface}, 0 10px 0 -4px ${colors.line}`,
        },
        style,
      ]}>
      <SurfaceProvider value={{ kind: 'plain' }}>{children}</SurfaceProvider>
    </View>
  );
}

/* ----------------------------------------------------------- register dots */

/** p present, a absent, l late, off Sunday/holiday, f not yet. */
export type Mark = 'p' | 'a' | 'l' | 'off' | 'f';

export function RegisterDot({ mark, large }: { mark: Mark; large?: boolean }) {
  const { colors } = useTheme();
  const size = large ? 14 : 11;
  const base: ViewStyle = {
    width: mark === 'off' ? 5 : size,
    height: size,
    borderRadius: mark === 'off' ? 3 : size / 2,
  };
  switch (mark) {
    case 'a':
      return <View style={[base, { boxShadow: `inset 0 0 0 2px ${colors.bad}` }]} />;
    case 'l':
      return (
        <View style={[base, { overflow: 'hidden', boxShadow: `inset 0 0 0 2px ${colors.warn}` }]}>
          <View
            style={{
              width: '50%',
              height: '100%',
              backgroundColor: colors.warn,
            }}
          />
        </View>
      );
    case 'off':
      return <View style={[base, { backgroundColor: colors.line }]} />;
    case 'f':
      return <View style={[base, { boxShadow: `inset 0 0 0 1.5px ${colors.lineStrong}` }]} />;
    default:
      return <View style={[base, { backgroundColor: colors.ok }]} />;
  }
}

/** `.reg`: a run of register dots. */
export function Register({
  marks,
  large,
  gap = 5,
  wrap = true,
  style,
  accessibilityLabel,
}: {
  marks: Mark[];
  large?: boolean;
  gap?: number;
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap,
          alignItems: 'center',
        },
        style,
      ]}>
      {marks.map((m, i) => (
        <RegisterDot key={i} mark={m} large={large} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------- ribbon */

export type RibbonCell =
  { kind: 'period'; state?: 'todo' | 'done' | 'now' | 'gap' | 'free' | 'cover'; label?: string } | { kind: 'break'; label?: string };

/** `.ribbon` + `.ribbon-lbl`: the school day as a strip of periods. */
export function Ribbon({
  cells,
  height = 30,
  showLabels = true,
  labelColor,
  accessibilityLabel,
}: {
  cells: RibbonCell[];
  height?: number;
  showLabels?: boolean;
  labelColor?: (cell: RibbonCell, i: number) => string | undefined;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }} accessible={!!accessibilityLabel} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {cells.map((c, i) => {
          if (c.kind === 'break') {
            return (
              <View
                key={i}
                style={{
                  flex: 0.35,
                  height,
                  borderRadius: 7,
                  boxShadow: `inset 0 0 0 1px ${colors.line}`,
                }}
              />
            );
          }
          const st = c.state ?? 'todo';
          const style: ViewStyle =
            st === 'done'
              ? { backgroundColor: colors.brandLine }
              : st === 'now'
                ? {
                    backgroundColor: colors.brand,
                    boxShadow: `0 0 0 3px ${colors.brandSoft}`,
                  }
                : st === 'free'
                  ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong }
                  : st === 'cover'
                    ? { backgroundColor: colors.pLav, boxShadow: `inset 0 0 0 1.5px ${colors.pLavInk}` }
                    : st === 'gap'
                      ? {
                          ...bgImage(
                            `repeating-linear-gradient(135deg, ${colors.badSoft} 0px, ${colors.badSoft} 5px, transparent 5px, transparent 9px)`,
                          ),
                          boxShadow: `inset 0 0 0 1.5px ${colors.bad}`,
                        }
                      : { backgroundColor: colors.track };
          return <View key={i} style={[{ flex: 1, height, borderRadius: 7 }, style]} />;
        })}
      </View>
      {showLabels ? (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {cells.map((c, i) => (
            <Text
              key={i}
              align="center"
              numberOfLines={1}
              rawColor={
                labelColor?.(c, i) ??
                (c.kind === 'period' && c.state === 'now'
                  ? colors.brandInk
                  : c.kind === 'period' && c.state === 'cover'
                    ? colors.pLavInk
                    : colors.muted)
              }
              style={{
                flex: c.kind === 'break' ? 0.35 : 1,
                fontFamily: fonts.bold,
                fontSize: 10,
                lineHeight: 10,
              }}>
              {c.label ?? ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------- heat cells */

/** Heat level for an attendance %: 3 = 97+, 2 = 94–96, 1 = 90–93, 0 = below 90. */
export function heatLevel(pct: number | null | undefined): 0 | 1 | 2 | 3 | null {
  if (pct === null || pct === undefined) return null;
  if (pct >= 97) return 3;
  if (pct >= 94) return 2;
  if (pct >= 90) return 1;
  return 0;
}

/** `.hx`: one heat-map cell. */
export function HeatCell({
  value,
  level,
  width,
  height = 30,
  label,
  style,
}: {
  value?: number | null;
  level?: 0 | 1 | 2 | 3 | null;
  width?: number;
  height?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const lv = level !== undefined ? level : heatLevel(value);
  const look: { bg: string; fg: string; shadow?: string } =
    lv === 3
      ? { bg: colors.hx3, fg: colors.hx3Ink }
      : lv === 2
        ? { bg: colors.hx2, fg: colors.hx2Ink }
        : lv === 1
          ? { bg: colors.hx1, fg: colors.hx1Ink }
          : lv === 0
            ? {
                bg: colors.badSoft,
                fg: colors.bad,
                shadow: `inset 0 0 0 1.5px ${colors.bad}`,
              }
            : {
                bg: 'transparent',
                fg: colors.muted,
                shadow: `inset 0 0 0 1px ${colors.line}`,
              };
  return (
    <View
      style={[
        {
          height,
          width,
          flex: width ? undefined : 1,
          borderRadius: 8,
          backgroundColor: look.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        look.shadow ? { boxShadow: look.shadow } : null,
        style,
      ]}>
      <Text rawColor={look.fg} num style={{ fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 12 }}>
        {label ?? (value === null || value === undefined ? '' : Math.round(value))}
      </Text>
    </View>
  );
}

/* --------------------------------------------------------------- route line */

export type RouteStop = { at: number; kind?: 'stop' | 'past' | 'home' };

/** `.route`: transit-style line. `at` values are 0–1 along the line; `bus` is the bus position. */
export function RouteLine({
  stops,
  progress,
  bus,
  busTone = 'brand',
  style,
}: {
  stops: RouteStop[];
  progress: number;
  bus?: number;
  /** Warn colour when the bus is running late. */
  busTone?: 'brand' | 'warn';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const busBg = busTone === 'warn' ? colors.warn : colors.brand;
  const busHalo = busTone === 'warn' ? colors.warnSoft : colors.brandSoft;
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%` as const;
  return (
    <View style={[{ height: 30 }, style]} accessible={false}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 13,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.track,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          width: pct(progress),
          top: 13,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.brand,
        }}
      />
      {stops.map((s, i) => {
        const home = s.kind === 'home';
        const size = home ? 18 : 12;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: pct(s.at),
              top: home ? 6 : 9,
              width: size,
              height: size,
              marginLeft: -size / 2,
              borderRadius: size / 2,
              backgroundColor: colors.surface,
              boxShadow: `inset 0 0 0 ${home ? 4 : 3}px ${home ? colors.pPinkInk : s.kind === 'past' ? colors.brand : colors.lineStrong}`,
            }}
          />
        );
      })}
      {bus !== undefined ? (
        <View
          style={{
            position: 'absolute',
            left: pct(bus),
            top: 1,
            width: 28,
            height: 28,
            marginLeft: -14,
            borderRadius: 9,
            backgroundColor: busBg,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 0 4px ${busHalo}`,
          }}>
          <Icon name="bus" size={ICON_SIZE.sm} rawColor={busTone === 'warn' ? colors.surface : colors.onBrand} />
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------- highlighter */

export type HighlightColor = 'butter' | 'pink' | 'mint' | 'sky' | 'lav';

/** `.hl`: highlighter band behind the lower half of a phrase inside a sentence. Use inside <Text>. */
export function Highlight({
  children,
  color = 'butter',
  style,
}: {
  children?: ReactNode;
  color?: HighlightColor;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const c = {
    butter: colors.hlButter,
    pink: colors.hlPink,
    mint: colors.hlMint,
    sky: colors.hlSky,
    lav: colors.hlLav,
  }[color];
  const band: TextStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage: `linear-gradient(transparent 55%, ${c} 55%, ${c} 94%, transparent 94%)`,
          paddingHorizontal: 3,
          marginHorizontal: -1,
          borderRadius: 3,
        } as TextStyle)
      : { backgroundColor: c };
  // Plain RN Text so it inherits the surrounding sentence's font, size and colour.
  return <RNText style={[band, style]}>{children}</RNText>;
}

/* ------------------------------------------------------------------ bubbles */

/** `.bubble-in` / `.bubble-out` chat bubbles. */
export function Bubble({ children, out, style }: { children: ReactNode; out?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { maxWidth: 270, paddingHorizontal: 14, paddingVertical: 10 },
        out
          ? {
              backgroundColor: colors.brand,
              borderRadius: 18,
              borderBottomRightRadius: 6,
              alignSelf: 'flex-end',
            }
          : {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 18,
              borderBottomLeftRadius: 6,
              alignSelf: 'flex-start',
            },
        style,
      ]}>
      {children}
    </View>
  );
}

/* --------------------------------------------------------------- logo mark */

/** The EduFlow mark: brand square with three waves. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const { colors } = useTheme();
  return <LogoSvg size={size} bg={colors.brand} fg={colors.onBrand} />;
}

function LogoSvg({ size, bg, fg }: { size: number; bg: string; fg: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width={32} height={32} rx={9} fill={bg} />
      <Path d="M8.5 11.5c3.2-2.8 6.3-2.8 9.5 0s5.6 2.4 7.5.6" stroke={fg} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M8.5 17c3.2-2.8 6.3-2.8 9.5 0s5.6 2.4 7.5.6" stroke={fg} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M8.5 22.5c3.2-2.8 6.3-2.8 9.5 0" stroke={fg} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/* ------------------------------------------------------------ icon in text */

export function InlineIcon({ name, color }: { name: IconName; color?: string }) {
  const { colors } = useTheme();
  return <Icon name={name} size={ICON_SIZE.sm} rawColor={color ?? colors.muted} />;
}

const styles = StyleSheet.create({
  holes: {
    position: 'absolute',
    top: 5,
    left: 22,
    right: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hole: { width: 5, height: 5, borderRadius: 2.5 },
  notch: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  notchV: {
    position: 'absolute',
    left: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  diaryHead: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 58,
    paddingRight: 16,
    borderBottomWidth: 1,
  },
  diaryRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 58,
    paddingRight: 14,
  },
});
