import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Icon, ICON_SIZE, Text, type IconName } from '@/ui';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The design's 14s loop: each module sends a pulse to the profile, 2s apart. */
const LOOP = 14000;
const W = 552;
const H = 392;
const CX = 276;
const CY = 192;

type Spoke = { key: string; icon: IconName; x1: number; y1: number; x2: number; y2: number; dot: [number, number] };

const SPOKES: Spoke[] = [
  { key: 'attendance', icon: 'calendarCheck', x1: 276, y1: 120, x2: 276, y2: 50, dot: [276, 85] },
  { key: 'marks', icon: 'award', x1: 339.2, y1: 157.6, x2: 438.6, y2: 103.5, dot: [388.9, 130.5] },
  { key: 'homework', icon: 'edit', x1: 347.1, y1: 203.1, x2: 478.8, y2: 223.6, dot: [413, 213.3] },
  { key: 'remarks', icon: 'chat', x1: 317.5, y1: 250.8, x2: 366.2, y2: 319.9, dot: [341.9, 285.4] },
  { key: 'fees', icon: 'wallet', x1: 234.5, y1: 250.8, x2: 185.8, y2: 319.9, dot: [210.1, 285.4] },
  { key: 'bus', icon: 'bus', x1: 204.9, y1: 203.1, x2: 73.2, y2: 223.6, dot: [139, 213.3] },
  { key: 'parents', icon: 'users', x1: 212.8, y1: 157.6, x2: 113.4, y2: 103.5, dot: [163.1, 130.5] },
];

const FLOW = Easing.bezierFn(0.45, 0, 0.3, 1);

/** 0–1 phase of item `i` in the 14s loop (each item starts 2s after the previous). */
function phaseOf(t: number, i: number): number {
  'worklet';
  const p = (t - (i * 2000) / LOOP) % 1;
  return p < 0 ? p + 1 : p;
}

function ellipseCircumference(a: number, b: number) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

function useLoop(duration: number, still: boolean, reverse = false): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    v.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, reverse);
  }, [v, duration, still, reverse]);
  return v;
}

/**
 * PLogin's brand diagram: the Student Profile at the centre, seven modules around it,
 * each sending its update down a spoke in turn.
 */
export function StudentOrbit() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const still = useReducedMotion();
  const clock = useLoop(LOOP, still);
  const orbit = useLoop(28000, still);
  const march = useLoop(3000, still);

  const C = ellipseCircumference(242, 172);
  const orbitProps = useAnimatedProps(() => ({ strokeDashoffset: -orbit.value * C }));
  const marchProps = useAnimatedProps(() => ({ strokeDashoffset: -march.value * 16 }));

  // Each pulse lands at 9% of its cycle (1.26s), so the profile beats every 2s from 1.26s.
  const beat = () => {
    'worklet';
    const q = ((clock.value * LOOP - 1260) % 2000) / 2000;
    return q < 0 ? q + 1 : q;
  };
  const rippleProps = useAnimatedProps(() => {
    const q = beat();
    return { r: 66 * (1 + 0.55 * q), strokeOpacity: 0.7 * (1 - q) };
  });
  const avatarStyle = useAnimatedStyle(() => {
    const q = beat();
    return { transform: [{ scale: q < 0.3 ? 1.14 - (0.14 * q) / 0.3 : 1 }] };
  });

  const events = [0, 1, 2, 3, 4, 5, 6].map((i) => t(`auth.orbit.event${i}`));

  return (
    <View style={styles.figure} accessible accessibilityRole="image" accessibilityLabel={t('auth.orbit.label')}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <AnimatedEllipse
          cx={CX}
          cy={CY}
          rx={208}
          ry={142}
          fill="none"
          stroke={colors.heroLine}
          strokeWidth={1}
          strokeDasharray="2 6"
          animatedProps={marchProps}
        />
        <Ellipse cx={CX} cy={CY} rx={242} ry={172} fill="none" stroke={colors.heroLine} strokeWidth={1} />
        {!still ? (
          <AnimatedEllipse
            cx={CX}
            cy={CY}
            rx={242}
            ry={172}
            fill="none"
            stroke={colors.gold}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${0.03 * C} ${0.97 * C}`}
            opacity={0.9}
            animatedProps={orbitProps}
          />
        ) : null}
        {SPOKES.map((s) => (
          <Line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={colors.gold} strokeWidth={1.25} opacity={0.4} />
        ))}
        {!still ? SPOKES.map((s, i) => <Pulse key={s.key} spoke={s} index={i} clock={clock} color={colors.gold} />) : null}
        {SPOKES.map((s) => (
          <Circle key={s.key} cx={s.dot[0]} cy={s.dot[1]} r={2.5} fill={colors.gold} />
        ))}
        <Circle cx={CX} cy={CY} r={78} fill="none" stroke={colors.heroLine} strokeWidth={1} />
        {!still ? (
          <AnimatedCircle cx={CX} cy={CY} r={66} fill="none" stroke={colors.gold} strokeWidth={1.5} animatedProps={rippleProps} />
        ) : null}
        <Circle cx={CX} cy={CY} r={66} fill={colors.hero2} stroke={colors.gold} strokeWidth={1.5} />
      </Svg>

      <View style={styles.centre}>
        <Animated.View style={[{ borderRadius: 999, boxShadow: `0 0 0 2px ${colors.gold}` }, avatarStyle]}>
          <Avatar initials="AS" size="sm" tone={1} />
        </Animated.View>
        <View style={{ alignItems: 'center', gap: 1 }}>
          <Text variant="sm" weight={700} rawColor={colors.onHero}>
            {t('auth.orbit.profile')}
          </Text>
          <View style={styles.feed}>
            {still ? (
              <Text variant="xxs" weight={600} rawColor={colors.heroMuted} align="center">
                {t('auth.orbit.static')}
              </Text>
            ) : (
              events.map((e, i) => <FeedEvent key={i} text={e} index={i} clock={clock} color={colors.gold} />)
            )}
          </View>
        </View>
      </View>

      <LiveSync still={still} />

      {SPOKES.map((s, i) => (
        <ModuleChip key={s.key} spoke={s} index={i} clock={clock} still={still} label={t(`auth.orbit.${s.key}`)} />
      ))}
    </View>
  );
}

function Pulse({ spoke, index, clock, color }: { spoke: Spoke; index: number; clock: SharedValue<number>; color: string }) {
  const L = Math.hypot(spoke.x2 - spoke.x1, spoke.y2 - spoke.y1);
  // CSS: pathLength 100, dasharray "10 110", offset -100 → 10 over the first 9% of the cycle.
  // The dash starts past the chip end and travels to the profile.
  const props = useAnimatedProps(() => {
    const p = phaseOf(clock.value, index);
    const k = Math.min(1, p / 0.09);
    const eased = FLOW(k);
    return {
      strokeDashoffset: (-100 + 110 * eased) * (L / 100),
      strokeOpacity: p < 0.095 ? 1 : 0,
    };
  });
  return (
    <AnimatedLine
      x1={spoke.x1}
      y1={spoke.y1}
      x2={spoke.x2}
      y2={spoke.y2}
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeDasharray={`${0.1 * L} ${1.1 * L}`}
      animatedProps={props}
    />
  );
}

function ModuleChip({
  spoke,
  index,
  clock,
  still,
  label,
}: {
  spoke: Spoke;
  index: number;
  clock: SharedValue<number>;
  still: boolean;
  label: string;
}) {
  const { colors } = useTheme();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    // Each chip bobs on its own 6s rhythm (CSS delay: -0.85s × i).
    bob.value = (index * 0.85) / 6;
    bob.value = withRepeat(withTiming(bob.value + 1, { duration: 6000, easing: Easing.linear }), -1);
  }, [bob, index, still]);
  const style = useAnimatedStyle(() => {
    const p = phaseOf(clock.value, index);
    const glow = p < 0.015 ? p / 0.015 : p < 0.08 ? 1 : p < 0.11 ? 1 - (p - 0.08) / 0.03 : 0;
    const b = bob.value % 1;
    return {
      borderColor: interpolateColor(glow, [0, 1], [colors.heroLine, colors.gold]),
      boxShadow: `0 0 0 ${4 * glow}px ${colors.gold}2E, 0 8px 18px -12px rgba(28,27,34,0.35)`,
      transform: [{ translateY: still ? 0 : -4 * Math.sin(Math.PI * b) ** 2 }],
    };
  });
  return (
    <View style={[styles.chipAnchor, { left: spoke.x2 - 100, top: spoke.y2 - 18, pointerEvents: 'none' }]}>
      <Animated.View style={[styles.chip, { backgroundColor: colors.hero }, style]}>
        <Icon name={spoke.icon} size={ICON_SIZE.sm} rawColor={colors.onHero} />
        <Text rawColor={colors.onHero} style={styles.chipText}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

function FeedEvent({ text, index, clock, color }: { text: string; index: number; clock: SharedValue<number>; color: string }) {
  // Visible from 10% to 21% of its cycle, sliding up in and out.
  const style = useAnimatedStyle(() => {
    const p = phaseOf(clock.value, index);
    let opacity = 0;
    let y = 5;
    if (p >= 0.085 && p < 0.1) {
      const k = (p - 0.085) / 0.015;
      opacity = k;
      y = 5 * (1 - k);
    } else if (p >= 0.1 && p < 0.21) {
      opacity = 1;
      y = 0;
    } else if (p >= 0.21 && p < 0.23) {
      const k = (p - 0.21) / 0.02;
      opacity = 1 - k;
      y = -5 * k;
    }
    return { opacity, transform: [{ translateY: y }] };
  });
  return (
    <Animated.Text numberOfLines={1} style={[styles.event, { color }, style]}>
      {text}
    </Animated.Text>
  );
}

function LiveSync({ still }: { still: boolean }) {
  const { colors } = useTheme();
  const blink = useLoop(1600, still);
  const ring = useAnimatedStyle(() => {
    const k = blink.value < 0.5 ? blink.value * 2 : 2 - blink.value * 2;
    return {
      boxShadow: `0 0 0 ${5 * k}px ${colors.ok}${Math.round(0x73 * (1 - k))
        .toString(16)
        .padStart(2, '0')}`,
    };
  });
  return (
    <View style={[styles.live, { backgroundColor: colors.heroWash, borderColor: colors.heroLine }]}>
      <Animated.View style={[styles.liveDot, { backgroundColor: colors.ok }, ring]} />
      <Text rawColor={colors.heroMuted} style={styles.liveText}>
        Live sync
      </Text>
    </View>
  );
}

/** "Principal · Teacher · Parent · Student": each name turns gold in turn (8s loop, 2s apart). */
export function RoleCycle() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const still = useReducedMotion();
  const loop = useLoop(8000, still);
  const roles = [t('roles.principal'), t('roles.teacher'), t('roles.parent'), t('roles.student')];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {roles.map((r, i) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {i > 0 ? (
            <Text variant="sm" rawColor={colors.heroMuted}>
              ·
            </Text>
          ) : null}
          <RoleName label={r} index={i} loop={loop} still={still} />
        </View>
      ))}
    </View>
  );
}

function RoleName({ label, index, loop, still }: { label: string; index: number; loop: SharedValue<number>; still: boolean }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => {
    if (still) return { color: colors.onHero };
    let p = (loop.value - (index * 2000) / 8000) % 1;
    if (p < 0) p += 1;
    const k = p < 0.22 ? 1 : p < 0.28 ? 1 - (p - 0.22) / 0.06 : 0;
    return { color: interpolateColor(k, [0, 1], [colors.onHero, colors.gold]) };
  });
  return <Animated.Text style={[{ fontFamily: fonts.bold, fontSize: 13, lineHeight: 19 }, style]}>{label}</Animated.Text>;
}

const styles = StyleSheet.create({
  figure: { width: W, height: H, alignSelf: 'center' },
  centre: {
    position: 'absolute',
    left: 210,
    top: 126,
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  feed: { height: 15, width: 160, alignItems: 'center' },
  event: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: fonts.bold, fontSize: 11, lineHeight: 15 },
  chipAnchor: { position: 'absolute', width: 200, height: 36, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingLeft: 11,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
  live: {
    position: 'absolute',
    left: 0,
    top: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 26,
    paddingLeft: 9,
    paddingRight: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  liveText: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14, letterSpacing: 0.23 },
});
