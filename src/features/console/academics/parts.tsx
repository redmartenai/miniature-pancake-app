import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { parseDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, toneColors, type Palette, type Tone } from '@/theme/tokens';
import { Icon, pointer, Sheet, Text, type IconName } from '@/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `color-mix(in srgb, a p%, b)` for two hex colours. */
export function mix(a: string, b: string, p: number): string {
  const hex = (c: string) => {
    const h = c.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const [x, y] = [hex(a), hex(b)];
  return `#${x
    .map((v, i) =>
      Math.round(v * p + y[i] * (1 - p))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** "Mon 12 Oct". */
export function dayLabel(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "12 Oct". */
export function shortDate(iso: string): string {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[parseDate(iso).getDay()];
}

/** "13:45" → "1:45" (the timetable's clock, no AM/PM). */
export function clock12(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
}

/** "Grade 6" for number grades, "Nursery" otherwise. */
export function useGradeLabel() {
  const { t } = useTranslation();
  return (grade: string) =>
    /^\d+$/.test(grade)
      ? t('console.academics.common.grade', { grade })
      : t(`console.academics.common.pre.${grade}`, { defaultValue: grade });
}

/** The short subject name the designs use ("Maths", "Social St.", "Computer"). */
export function useSubjectLabel() {
  const { t } = useTranslation();
  return (code: string, fallback?: string) => t(`console.academics.subjects.${code}`, { defaultValue: fallback ?? code });
}

/** A compact pill (18–20px), as used inside timetable cells and list rows. */
export function MiniPill({ label, tone, height = 18 }: { label: string; tone: Tone | 'neutral'; height?: number }) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone as Tone);
  return (
    <View style={[styles.mini, { backgroundColor: bg, height, paddingHorizontal: height > 18 ? 8 : 6 }]}>
      <Text rawColor={fg} style={{ fontFamily: fonts.semibold, fontSize: height > 18 ? 11 : 10.5, lineHeight: 13 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** `.legend` row item: swatch (or any node) + 12px semibold ink-2 label. */
export function LegendEntry({ swatch, label }: { swatch: ReactNode; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      {swatch}
      <Text rawColor={colors.ink2} style={styles.legendText}>
        {label}
      </Text>
    </View>
  );
}

export function Sw({ color, border }: { color: string; border?: string }) {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 3,
        backgroundColor: color,
        boxShadow: border ? `inset 0 0 0 1px ${border}` : undefined,
      }}
    />
  );
}

/** A 20×20 section letter badge (`A`, `B`, `C`). */
export function SectionBadge({ letter }: { letter: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text rawColor={colors.ink} style={{ fontFamily: fonts.bold, fontSize: 11, lineHeight: 13 }}>
        {letter}
      </Text>
    </View>
  );
}

/** An inline icon + text row. */
export function IconText({
  icon,
  text,
  color,
  size = 12,
  weight = 'bold',
}: {
  icon: IconName;
  text: string;
  color: string;
  size?: number;
  weight?: 'bold' | 'semibold' | 'medium';
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={size + 2} rawColor={color} />
      <Text rawColor={color} style={{ fontFamily: fonts[weight], fontSize: size, lineHeight: size + 4 }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** A choice list inside a sheet (class, teacher or room picker; term picker). */
export function PickerSheet<T extends string>({
  visible,
  onClose,
  title,
  options,
  value,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { id: T; label: string; detail?: string }[];
  value?: T;
  onPick: (id: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                onPick(o.id);
                onClose();
              }}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.pick,
                pointer,
                {
                  backgroundColor: on ? colors.brand : hovered ? colors.subtle : colors.surface,
                  borderColor: on ? colors.brand : colors.lineStrong,
                },
              ]}>
              <Text rawColor={on ? colors.onBrand : colors.ink2} style={{ fontFamily: fonts.semibold, fontSize: 13 }}>
                {o.label}
              </Text>
              {o.detail ? (
                <Text rawColor={on ? colors.onBrand : colors.muted} style={{ fontFamily: fonts.medium, fontSize: 11 }}>
                  {o.detail}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

/** Row container helper. */
export function HRow({
  children,
  gap = 8,
  style,
  align = 'center',
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
}) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap }, style]}>{children}</View>;
}

/** Background for a subject in the timetable (the design's category tints). */
export function subjectTint(c: Palette, code: string | undefined): { bg: string; border?: string } {
  switch (code) {
    case 'MATH':
      return { bg: c.brandSoft };
    case 'ENG':
      return { bg: c.infoSoft };
    case 'SCI':
      return { bg: c.okSoft };
    case 'HIN':
      return { bg: c.warnSoft };
    case 'SST':
    case 'ECO':
      return { bg: c.sunken };
    case 'CS':
      return { bg: c.selected };
    default:
      return { bg: c.subtle, border: c.line };
  }
}

const styles = StyleSheet.create({
  mini: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  badge: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pick: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
