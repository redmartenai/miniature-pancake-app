import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type DumbbellRow = {
  label: string;
  from: number;
  to: number;
  highlight?: boolean;
  note?: string;
  color?: string;
  /** Colours the row label too (e.g. a grade that fell). */ labelColor?: string;
};

/**
 * Before → after per row: a hollow dot for the earlier value, a filled dot for the later one.
 * Used for "How each subject moved" (UT1 → UT2).
 */
export function Dumbbell({
  rows,
  labelWidth = 124,
  rowHeight = 26,
  accessibilityLabel,
  min: minProp,
  max = 100,
  step = 10,
  formatTick = (v) => String(v),
}: {
  rows: DumbbellRow[];
  labelWidth?: number;
  rowHeight?: number;
  accessibilityLabel?: string;
  /** Axis start; defaults to just below the lowest value, rounded down to `step`. */
  min?: number;
  max?: number;
  step?: number;
  formatTick?: (v: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const values = rows.flatMap((r) => [r.from, r.to]);
  const min = minProp ?? Math.max(0, Math.floor((Math.min(...values) - 2) / step) * step);
  const left = labelWidth + 16;
  const right = 14;
  const plot = Math.max(1, width - left - right);
  const x = (v: number) => left + ((v - min) / (max - min)) * plot;
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  const height = rows.length * rowHeight + 26;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((v) => (
            <Line key={v} x1={x(v)} y1={4} x2={x(v)} y2={height - 26} stroke={colors.line} strokeWidth={1} />
          ))}
          {ticks.map((v) => (
            <SvgText key={`t${v}`} x={x(v)} y={height - 6} fill={colors.muted} fontSize={11} fontFamily={fonts.medium} textAnchor="middle">
              {formatTick(v)}
            </SvgText>
          ))}
          {rows.map((r, i) => {
            const y = 4 + i * rowHeight + rowHeight / 2;
            return (
              <G key={r.label}>
                <SvgText
                  x={labelWidth}
                  y={y + 4}
                  fill={r.labelColor ?? (r.highlight ? colors.ink : colors.ink2)}
                  fontSize={11.5}
                  fontFamily={r.highlight ? fonts.bold : fonts.medium}
                  textAnchor="end">
                  {r.label}
                </SvgText>
                <Line
                  x1={x(r.from)}
                  y1={y}
                  x2={x(r.to)}
                  y2={y}
                  stroke={r.color ?? colors.c1}
                  strokeOpacity={0.35}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                <Circle cx={x(r.from)} cy={y} r={4.5} fill={colors.surface} stroke={r.color ?? colors.c1} strokeWidth={2} />
                <Circle cx={x(r.to)} cy={y} r={5} fill={r.color ?? colors.c1} />
                {r.note ? (
                  <SvgText
                    x={x(Math.max(r.from, r.to)) + 10}
                    y={y + 4}
                    fill={r.labelColor ?? colors.ink}
                    fontSize={11.5}
                    fontFamily={fonts.bold}>
                    {r.note}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}
