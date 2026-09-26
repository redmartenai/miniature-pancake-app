import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type BarSeries = { key: string; color: string; label?: string };
export type BarDatum = {
  label: string;
  /** One value per series (null = no bar). */
  values: (number | null)[];
  /** Bold label above the tallest bar of the group (`.ch-label`). */
  top?: string;
  /** Small muted line above `top` (`.ch-sub`), e.g. "Term 1 due 30 Jun". */
  sub?: string;
  /** Still-open period: hollow, dashed, pastel fill. */
  open?: boolean;
  /** Draw the x label in ink/bold. */
  highlight?: boolean;
  /** Per-datum colour override for single-series charts. */
  color?: string;
};

/** Top-rounded bar path (the designs round only the top corners). */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x} ${y + h}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h}Z`;
}

/**
 * Vertical bars, single or grouped: y grid with formatted ticks, optional labels over bars,
 * an optional dashed reference line (class average, target). Sizes to its container width.
 */
export function BarChart({
  data,
  series,
  height = 250,
  yMax,
  yMin = 0,
  ticks,
  formatY = (v) => String(v),
  barWidth,
  groupGap = 3,
  axisWidth = 48,
  refLine,
  xTitle,
  openFill,
  openStroke,
  accessibilityLabel,
}: {
  data: BarDatum[];
  series: BarSeries[];
  height?: number;
  yMax: number;
  yMin?: number;
  ticks: number[];
  formatY?: (v: number) => string;
  /** Width of one bar; defaults to a share of the slot. */
  barWidth?: number;
  groupGap?: number;
  axisWidth?: number;
  refLine?: { value: number; label?: string; color?: string };
  xTitle?: string;
  openFill?: string;
  openStroke?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const top = 30;
  const bottom = xTitle ? 44 : 26;
  const left = axisWidth + 10;
  const right = refLine?.label ? 64 : 8;
  const plotH = height - top - bottom;
  const plotW = Math.max(1, width - left - right);
  const y = (v: number) => top + plotH - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * plotH;
  const slot = plotW / Math.max(1, data.length);
  const n = series.length;
  const bw = barWidth ?? Math.min(n > 1 ? 14 : 46, (slot * (n > 1 ? 0.7 : 0.6) - groupGap * (n - 1)) / n);
  const groupW = bw * n + groupGap * (n - 1);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((v) => (
            <G key={`t${v}`}>
              <Line
                x1={left}
                y1={y(v)}
                x2={width - right}
                y2={y(v)}
                stroke={v === yMin ? colors.lineStrong : colors.line}
                strokeWidth={1}
              />
              <SvgText x={axisWidth} y={y(v) + 4} fill={colors.muted} fontSize={11} fontFamily={fonts.medium} textAnchor="end">
                {formatY(v)}
              </SvgText>
            </G>
          ))}
          {data.map((d, i) => {
            const x0 = left + slot * i + (slot - groupW) / 2;
            const tallest = Math.max(...d.values.map((v) => v ?? 0));
            return (
              <G key={`${d.label}${i}`}>
                {d.values.map((v, s) => {
                  if (v == null) return null;
                  const x = x0 + s * (bw + groupGap);
                  const h = Math.max(0, y(yMin) - y(v));
                  const color = d.color ?? series[s]?.color ?? colors.brand;
                  return d.open ? (
                    <Path
                      key={s}
                      d={barPath(x, y(v), bw, h, 4)}
                      fill={openFill ?? colors.pButter}
                      stroke={openStroke ?? colors.pButterInk}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                  ) : (
                    <Path key={s} d={barPath(x, y(v), bw, h, 4)} fill={color} />
                  );
                })}
                {d.top ? (
                  <SvgText
                    x={x0 + groupW / 2}
                    y={y(tallest) - 8}
                    fill={colors.ink}
                    fontSize={11.5}
                    fontFamily={fonts.bold}
                    textAnchor="middle">
                    {d.top}
                  </SvgText>
                ) : null}
                {d.sub ? (
                  <SvgText
                    x={x0 + groupW / 2}
                    y={y(tallest) - 22 - (d.top ? 0 : -14)}
                    fill={colors.muted}
                    fontSize={11}
                    fontFamily={fonts.semibold}
                    textAnchor="middle">
                    {d.sub}
                  </SvgText>
                ) : null}
                <SvgText
                  x={left + slot * i + slot / 2}
                  y={height - bottom + 18}
                  fill={d.highlight ? colors.ink : colors.muted}
                  fontSize={11}
                  fontFamily={d.highlight ? fonts.bold : fonts.medium}
                  textAnchor="middle">
                  {d.label}
                </SvgText>
              </G>
            );
          })}
          {refLine ? (
            <G>
              <Line
                x1={left}
                y1={y(refLine.value)}
                x2={width - right}
                y2={y(refLine.value)}
                stroke={refLine.color ?? colors.ink2}
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              {refLine.label ? (
                <SvgText
                  x={width - right + 6}
                  y={y(refLine.value) + 4}
                  fill={refLine.color ?? colors.ink2}
                  fontSize={11}
                  fontFamily={fonts.bold}>
                  {refLine.label}
                </SvgText>
              ) : null}
            </G>
          ) : null}
          {xTitle ? (
            <SvgText x={left + plotW / 2} y={height - 6} fill={colors.muted} fontSize={11} fontFamily={fonts.semibold} textAnchor="middle">
              {xTitle}
            </SvgText>
          ) : null}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}
