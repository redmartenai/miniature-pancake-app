import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { TripLive } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { Pill, Text } from '@/ui';

import { stopLine } from './status';

/** Vertical list of stops: passed, at stop, next and upcoming, with times or ETAs. */
export function StopTimeline({ live, myStopId }: { live: TripLive; myStopId?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View accessibilityRole="list">
      {live.stops.map((stop, index) => {
        const done = stop.status === 'departed' || stop.status === 'skipped';
        const current = stop.status === 'at_stop' || stop.status === 'next';
        const mine = stop.id === myStopId;
        const dotColor = done ? colors.textMuted : current ? colors.primary : colors.border;
        const isLast = index === live.stops.length - 1;
        return (
          <View key={stop.id} style={styles.row} accessibilityLabel={`${stop.name}, ${stopLine(stop, live, t)}${mine ? `, ${t('bus.yourStop')}` : ''}`}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  { borderColor: dotColor, backgroundColor: done || current ? dotColor : colors.surface },
                  current && styles.dotCurrent,
                ]}
              />
              {!isLast ? <View style={[styles.line, { backgroundColor: done ? colors.textMuted : colors.border }]} /> : null}
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text variant={current ? 'subheading' : 'body'} color={done ? 'textMuted' : 'ink'} numberOfLines={1} style={styles.name}>
                  {stop.name}
                </Text>
                {mine ? <Pill label={t('bus.yourStop')} tone="accent" /> : null}
              </View>
              <Text variant="caption" color={current ? 'primary' : 'textMuted'}>
                {stopLine(stop, live, t)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, minHeight: 54 },
  rail: { width: 18, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 5 },
  dotCurrent: { width: 16, height: 16, borderRadius: 8, marginTop: 3 },
  line: { flex: 1, width: 2, marginVertical: 2, borderRadius: 1 },
  body: { flex: 1, paddingBottom: spacing.sm, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flexShrink: 1 },
});
