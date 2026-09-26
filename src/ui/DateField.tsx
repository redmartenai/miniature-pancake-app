import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatDate, isoDate, monthName, parseDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

import { pointer } from './css';
import { Icon, ICON_SIZE } from './Icon';
import { IconButton } from './IconButton';
import { Chip } from './Pill';
import { Sheet } from './Sheet';
import { Text } from './Text';

/** A field that looks like an input ("Thu, 24 Sep 2026") and opens a picker sheet. */
function FieldShell({ label, value, placeholder, trailing, onPress, style, accessibilityLabel }: {
  label?: string;
  value: string;
  placeholder?: string;
  trailing?: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ gap: 7 }, style]}>
      {label ? (
        <Text variant="sm" weight={600} rawColor={colors.ink2} style={{ fontSize: 12.5 }}>
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? [label, value || placeholder].filter(Boolean).join(', ')}
        onPress={onPress}
        style={[styles.field, { borderColor: colors.lineStrong, backgroundColor: colors.surface }, pointer]}>
        <Icon name="calendar" size={ICON_SIZE.sm} rawColor={colors.muted} />
        <Text variant="body" numberOfLines={1} rawColor={value ? colors.ink : colors.faint} style={{ flex: 1 }}>
          {value || placeholder}
        </Text>
        {trailing}
      </Pressable>
    </View>
  );
}

/**
 * Pick a date from a month calendar. `min`/`max` are ISO dates; Sundays are off unless `sundays` is set.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  sundays = false,
  trailing,
  withYear,
  style,
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  sundays?: boolean;
  trailing?: ReactNode;
  withYear?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const shown = value ? `${weekdayName(value, true)}, ${formatDate(value, { year: withYear })}` : '';
  return (
    <>
      <FieldShell label={label} value={shown} onPress={() => setOpen(true)} trailing={trailing} style={style} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? t('common.pickDate')}>
        <MonthPicker
          value={value}
          min={min}
          max={max}
          sundays={sundays}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

function MonthPicker({ value, min, max, sundays, onPick }: { value: string; min?: string; max?: string; sundays: boolean; onPick: (iso: string) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const start = parseDate(value || isoDate(new Date()));
  const [month, setMonth] = useState(new Date(start.getFullYear(), start.getMonth(), 1));
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const monthIso = isoDate(month).slice(0, 7);
  const canPrev = !min || min.slice(0, 7) < monthIso;
  const canNext = !max || max.slice(0, 7) > monthIso;
  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <IconButton icon="chevronLeft" variant="bare" size="lg" disabled={!canPrev} label={t('common.previousMonth')} onPress={() => shift(-1)} />
        <Text variant="h4">
          {monthName(isoDate(month))} {month.getFullYear()}
        </Text>
        <IconButton icon="chevronRight" variant="bare" size="lg" disabled={!canNext} label={t('common.nextMonth')} onPress={() => shift(1)} />
      </View>
      <View style={styles.grid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} variant="xxs" color="muted" weight={700} align="center" style={styles.cell}>
            {d}
          </Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const iso = isoDate(d);
          const off = (!sundays && d.getDay() === 0) || (min && iso < min) || (max && iso > max);
          const on = iso === value;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !!off }}
              accessibilityLabel={formatDate(d, { weekday: true, year: true })}
              disabled={!!off}
              onPress={() => onPick(iso)}
              style={[styles.cell, styles.day, on && { backgroundColor: colors.brand }, !off && pointer]}>
              <Text variant="sm" weight={on ? 700 : 500} num rawColor={on ? colors.onBrand : off ? colors.faint : colors.ink}>
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Pick a time from a list of slots (every `step` minutes between `from` and `to`, "HH:MM"). */
export function TimeField({
  label,
  value,
  onChange,
  from = '07:00',
  to = '19:00',
  step = 15,
  style,
}: {
  label?: string;
  value: string;
  onChange: (hhmm: string) => void;
  from?: string;
  to?: string;
  step?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const slots = useMemo(() => {
    const out: string[] = [];
    const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
    for (let m = toMin(from); m <= toMin(to); m += step) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    return out;
  }, [from, to, step]);
  return (
    <>
      <FieldShell label={label} value={value ? clock(value) : ''} placeholder={t('common.pickTime')} onPress={() => setOpen(true)} style={style} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? t('common.pickTime')}>
        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
          {slots.map((s) => (
            <Chip
              key={s}
              label={clock(s)}
              selected={s === value}
              onPress={() => {
                onChange(s);
                setOpen(false);
              }}
            />
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}


const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  field: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: 21 },
});

/** Just the calendar in a sheet, for screens with their own date button. */
export function DateSheet({ visible, onClose, title, value, onPick, min, max }: { visible: boolean; onClose: () => void; title: string; value: string; onPick: (iso: string) => void; min?: string; max?: string }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <MonthPicker
        value={value}
        min={min}
        max={max}
        sundays={false}
        onPick={(iso) => {
          onPick(iso);
          onClose();
        }}
      />
    </Sheet>
  );
}
