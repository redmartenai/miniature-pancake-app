import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

type Point = { label: string; value: number };

/** Percent-over-time line (0–100) with the latest value labelled. */
export function TrendChart({ points, height = 150 }: { points: Point[]; height?: number }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const pad = { top: 18, right: 18, bottom: 26, left: 30 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const min = Math.max(0, Math.floor((Math.min(...points.map((p) => p.value), 100) - 10) / 10) * 10);
  const max = 100;
  const x = (i: number) => pad.left + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v: number) => pad.top + innerH - ((v - min) / (max - min || 1)) * innerH;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const area = points.length > 1 ? `${line} L${x(points.length - 1)},${pad.top + innerH} L${x(0)},${pad.top + innerH} Z` : '';
  const ticks = [min, Math.round((min + max) / 2), max];
  const summary = points.map((p) => `${p.label} ${p.value}%`).join(', ');

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={summary} style={styles.wrap}>
      {width > 0 && points.length ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map((tick) => (
            <Line key={tick} x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={colors.borderSoft} strokeWidth={1} />
          ))}
          {ticks.map((tick) => (
            <SvgText key={`t${tick}`} x={pad.left - 6} y={y(tick) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end" fontFamily={fonts.regular}>
              {tick}
            </SvgText>
          ))}
          {area ? <Path d={area} fill="url(#fill)" /> : null}
          <Path d={line} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <Circle key={p.label} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 3.5} fill={i === points.length - 1 ? colors.primary : colors.surface} stroke={colors.primary} strokeWidth={2} />
          ))}
          {points.map((p, i) => (
            <SvgText key={`l${p.label}`} x={x(i)} y={height - 8} fontSize={10.5} fill={colors.textMuted} textAnchor="middle" fontFamily={fonts.medium}>
              {p.label}
            </SvgText>
          ))}
          {points.length ? (
            <SvgText
              x={x(points.length - 1)}
              y={y(points[points.length - 1].value) - 10}
              fontSize={12}
              fill={colors.ink}
              textAnchor={points.length > 1 ? 'end' : 'middle'}
              fontFamily={fonts.semibold}>
              {`${points[points.length - 1].value}%`}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** One subject's score as a bar, with the class average as a marker. */
export function ScoreBar({ percent, average, color }: { percent: number; average: number | null; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
      <View style={[styles.fill, { width: `${Math.min(100, percent)}%`, backgroundColor: color }]} />
      {average !== null ? <View style={[styles.marker, { left: `${Math.min(100, average)}%`, backgroundColor: colors.ink }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  track: { height: 8, borderRadius: 4, overflow: 'visible', justifyContent: 'center' },
  fill: { height: 8, borderRadius: 4 },
  marker: { position: 'absolute', width: 2, height: 14, borderRadius: 1, marginLeft: -1 },
});
