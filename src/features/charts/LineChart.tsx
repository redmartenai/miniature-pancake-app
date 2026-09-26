import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type LineSeries = {
  key: string;
  color: string;
  /** One value per x label; null leaves a gap. */
  points: (number | null)[];
  /** Bold label at the last point (`.ch-label`), with an optional muted line under it. */
  endLabel?: string;
  endSub?: string;
  /** Fill under the line. */
  area?: boolean;
  dashed?: boolean;
  /** Draw dots on every point (default true). */
  dots?: boolean;
};

/**
 * Lines over x labels with a y grid. Optional dashed target line with a label, area fill,
 * and end labels on the right. Sizes to its container width.
 */
export function LineChart({
  labels,
  series,
  height = 220,
  yMin,
  yMax,
  ticks,
  formatY = (v) => String(v),
  target,
  axisWidth = 40,
  endWidth = 76,
  accessibilityLabel,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  yMin: number;
  yMax: number;
  ticks: number[];
  formatY?: (v: number) => string;
  target?: { value: number; label?: string };
  axisWidth?: number;
  /** Room on the right for end labels. */
  endWidth?: number;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const top = 14;
  const bottom = 26;
  const left = axisWidth + 12;
  const hasEnd = series.some((s) => s.endLabel);
  const right = hasEnd ? endWidth : 14;
  const plotW = Math.max(1, width - left - right);
  const plotH = height - top - bottom;
  const x = (i: number) => left + (labels.length <= 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW);
  const y = (v: number) => top + plotH - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * plotH;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            {series.map((s) => (
              <LinearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={s.color} stopOpacity={0.16} />
                <Stop offset="1" stopColor={s.color} stopOpacity={0.04} />
              </LinearGradient>
            ))}
          </Defs>
          {ticks.map((v) => (
            <G key={`t${v}`}>
              <Line x1={left} y1={y(v)} x2={left + plotW} y2={y(v)} stroke={v === yMin ? colors.lineStrong : colors.line} strokeWidth={1} />
              <SvgText x={axisWidth} y={y(v) + 4} fill={colors.muted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">
                {formatY(v)}
              </SvgText>
            </G>
          ))}
          {labels.map((l, i) => (
            <SvgText key={`x${i}`} x={x(i)} y={height - 8} fill={colors.muted} fontSize={11} fontFamily={fonts.medium} textAnchor="middle">
              {l}
            </SvgText>
          ))}
          {target ? (
            <G>
              <Line
                x1={left}
                y1={y(target.value)}
                x2={left + plotW}
                y2={y(target.value)}
                stroke={colors.ink2}
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              {target.label ? (
                <SvgText x={left + 6} y={y(target.value) - 6} fill={colors.ink2} fontSize={11} fontFamily={fonts.semibold}>
                  {target.label}
                </SvgText>
              ) : null}
            </G>
          ) : null}
          {series.map((s) => {
            const pts = s.points.map((v, i) => (v == null ? null : ([x(i), y(v)] as const)));
            const segs: (readonly [number, number])[][] = [];
            let cur: (readonly [number, number])[] = [];
            pts.forEach((p) => {
              if (p) cur.push(p);
              else if (cur.length) {
                segs.push(cur);
                cur = [];
              }
            });
            if (cur.length) segs.push(cur);
            const last = [...pts].reverse().find(Boolean);
            return (
              <G key={s.key}>
                {s.area
                  ? segs.map((seg, k) => (
                      <Path
                        key={`a${k}`}
                        d={`M${seg[0][0]} ${y(yMin)} ${seg.map((p) => `L${p[0]} ${p[1]}`).join(' ')} L${seg[seg.length - 1][0]} ${y(yMin)} Z`}
                        fill={`url(#area-${s.key})`}
                      />
                    ))
                  : null}
                {segs.map((seg, k) => (
                  <Path
                    key={`l${k}`}
                    d={seg.map((p, j) => `${j ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')}
                    stroke={s.color}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={s.dashed ? '5 4' : undefined}
                  />
                ))}
                {s.dots !== false ? (
                  pts.map((p, i) =>
                    p ? (
                      <Circle key={`d${i}`} cx={p[0]} cy={p[1]} r={3.5} fill={s.color} stroke={colors.surface} strokeWidth={1.5} />
                    ) : null,
                  )
                ) : last ? (
                  <Circle cx={last[0]} cy={last[1]} r={4} fill={s.color} stroke={colors.surface} strokeWidth={1.5} />
                ) : null}
                {s.endLabel && last ? (
                  <G>
                    <SvgText x={last[0] + 12} y={last[1] - (s.endSub ? 2 : -4)} fill={colors.ink} fontSize={11.5} fontFamily={fonts.bold}>
                      {s.endLabel}
                    </SvgText>
                    {s.endSub ? (
                      <SvgText x={last[0] + 12} y={last[1] + 12} fill={colors.muted} fontSize={11} fontFamily={fonts.semibold}>
                        {s.endSub}
                      </SvgText>
                    ) : null}
                  </G>
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

/** A tiny trend line with no axes (staff attendance, KPI cards). */
export function Sparkline({
  points,
  color,
  height = 36,
  area = true,
  min,
  max,
}: {
  points: number[];
  color?: string;
  height?: number;
  area?: boolean;
  min?: number;
  max?: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const stroke = color ?? colors.brand;
  const lo = min ?? Math.min(...points);
  const hi = max ?? Math.max(...points);
  const span = hi - lo || 1;
  const x = (i: number) => 2 + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (width - 4));
  const y = (v: number) => 3 + (height - 6) * (1 - (v - lo) / span);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  const id = `spark${Math.round(hi * 100)}${points.length}`;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && points.length ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.18} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {area ? <Path d={`${d} L${x(points.length - 1)} ${height} L${x(0)} ${height} Z`} fill={`url(#${id})`} /> : null}
          <Path d={d} stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={3} fill={stroke} />
        </Svg>
      ) : null}
    </View>
  );
}
