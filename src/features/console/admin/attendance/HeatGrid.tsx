import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { HeatCell, Text } from '@/ui';

import type { HeatSection } from '../api';

const LABEL_W = 44;
const GAP = 4;
const CELL_H = 24;
const TODAY_GAP = 6;

export function dayLabel(iso: string) {
  return `${weekdayName(iso, true)} ${Number(iso.slice(8, 10))}`;
}

/** Sections × school days of % present (`.hx` cells), a small gap between grades, "Today" set apart. */
export function HeatGrid({
  days,
  sections,
  label,
  lastIsToday,
  labelWidth = LABEL_W,
}: {
  days: string[];
  sections: { label: string; grade: string; values: (number | null)[] }[];
  label: string;
  lastIsToday: boolean;
  labelWidth?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const last = days.length - 1;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ gap: GAP }}>
      <View style={styles.row}>
        <View style={{ width: labelWidth }} />
        {days.map((d, i) => (
          <View key={d} style={[styles.col, i === last && { marginLeft: TODAY_GAP }]}>
            <Text
              numberOfLines={1}
              style={[
                styles.day,
                {
                  color: i === last && lastIsToday ? colors.ink : colors.muted,
                  fontFamily: i === last && lastIsToday ? fonts.extrabold : fonts.bold,
                },
              ]}>
              {i === last && lastIsToday ? t('console.admin.attendance.todayCol') : dayLabel(d)}
            </Text>
          </View>
        ))}
      </View>
      {sections.map((s, r) => (
        <Fragment key={s.label}>
          {r > 0 && sections[r - 1].grade !== s.grade ? <View style={{ height: 3 }} /> : null}
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.ink, width: labelWidth }]}>{s.label}</Text>
            {s.values.map((v, i) => (
              <View key={i} style={[styles.col, styles.cellWrap, i === last && { marginLeft: TODAY_GAP }]}>
                <HeatCell value={v} height={CELL_H} />
              </View>
            ))}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

export type { HeatSection };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  col: { flex: 1, minWidth: 0 },
  day: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  // HeatCell has flex: 1; in a row it fills the column's width and keeps its own height.
  cellWrap: { flexDirection: 'row' },
  label: { width: LABEL_W, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
});
