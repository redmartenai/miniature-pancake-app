import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Text } from '@/ui';

export type Segment = { value: number; color: string; label?: string };

/** One horizontal bar split into coloured segments (sources, channels, statuses). */
export function StackedBar({
  segments,
  height = 12,
  gap = 2,
  style,
}: {
  segments: Segment[];
  height?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const shown = segments.filter((s) => s.value > 0);
  return (
    <View
      style={[{ flexDirection: 'row', height, gap, borderRadius: 999, overflow: 'hidden' }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={shown.map((s) => `${s.label ?? ''} ${s.value}`).join(', ')}>
      {shown.map((s, i) => (
        <View key={`${s.label}${i}`} style={{ flexGrow: s.value / total, flexBasis: 0, backgroundColor: s.color }} />
      ))}
    </View>
  );
}

export type MonthBlock = { value: number; label?: string; strong?: boolean };

/**
 * The fee "month blocks" bar: one block per month of payments laid end to end, filling `collected / total`
 * of the track, with a target marker (and label above it). Values share one unit (e.g. rupees).
 */
export function MonthBlocks({
  blocks,
  total,
  target,
  targetLabel,
  color,
  track,
  height = 22,
}: {
  blocks: MonthBlock[];
  total: number;
  target?: number;
  targetLabel?: string;
  color?: string;
  track?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const [labelWidth, setLabelWidth] = useState(0);
  const fill = color ?? colors.pButterInk;
  const sum = blocks.reduce((a, b) => a + b.value, 0);
  const width = `${total ? Math.min(100, (sum / total) * 100) : 0}%` as const;
  const at = target != null && total ? (`${Math.min(100, (target / total) * 100)}%` as const) : null;
  const shown = blocks.filter((b) => b.value > 0);
  return (
    <View style={{ gap: 8, paddingTop: targetLabel ? 16 : 0 }}>
      <View style={{ height, borderRadius: 7, backgroundColor: track ?? colors.pTrack }}>
        <View style={{ flexDirection: 'row', gap: 2, width, height: '100%', borderRadius: 7, overflow: 'hidden' }}>
          {shown.map((b, i) => (
            <View key={i} style={{ flexGrow: b.value, flexBasis: 0, backgroundColor: fill }} />
          ))}
        </View>
        {at ? (
          <>
            <View style={{ position: 'absolute', left: at, top: -6, bottom: -6, width: 2, borderRadius: 1, backgroundColor: colors.ink }} />
            {targetLabel ? (
              <Text
                onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
                style={[styles.targetLabel, { color: colors.ink, left: at, marginLeft: -labelWidth / 2 }]}
                numberOfLines={1}>
                {targetLabel}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
      {shown.some((b) => b.label) ? (
        <View style={{ flexDirection: 'row', gap: 2, width }}>
          {shown.map((b, i) => (
            <Text
              key={i}
              style={[
                styles.blockLabel,
                {
                  flexGrow: b.value,
                  flexBasis: 0,
                  color: b.strong ? colors.ink2 : colors.muted,
                  fontFamily: b.strong ? fonts.bold : fonts.semibold,
                },
              ]}
              numberOfLines={1}>
              {b.label ?? ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  targetLabel: { position: 'absolute', top: -22, fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, whiteSpace: 'nowrap' } as TextStyle,
  blockLabel: { fontSize: 11, lineHeight: 14, minWidth: 0 },
});
