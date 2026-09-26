import { createContext, useContext } from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, uiFont, type Palette } from '@/theme/tokens';

/** Phone screens use a 15px base (`.ef.phone`); the web console uses 14px. */
export const DensityContext = createContext<'phone' | 'web'>('phone');

export type TextVariant =
  // Design scale (eduflow.css)
  | 'hero'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'lg'
  | 'body'
  | 'sm'
  | 'xs'
  | 'xxs'
  | 'eyebrow'
  | 'kicker'
  | 'kpi'
  | 'kpiSm'
  | 'appbarTitle'
  | 'secTitle'
  | 'sentence'
  // Legacy names kept for screens not yet redesigned
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'number';

const em = (size: number, value: number) => size * value;

const VARIANTS: Record<Exclude<TextVariant, 'body'>, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 42, lineHeight: 44, letterSpacing: em(42, -0.035) },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: em(30, -0.03) },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26.5, letterSpacing: em(22, -0.02) },
  h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, letterSpacing: em(16, -0.01) },
  h4: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
  lg: { fontFamily: fonts.medium, fontSize: 15.5, lineHeight: 24 },
  sm: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  xs: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  xxs: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: em(11, 0.12), textTransform: 'uppercase' },
  kicker: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: em(11, 0.14), textTransform: 'uppercase' },
  kpi: { fontFamily: fonts.display, fontSize: 34, lineHeight: 36, letterSpacing: em(34, -0.035), fontVariant: ['tabular-nums'] },
  kpiSm: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, letterSpacing: em(26, -0.03), fontVariant: ['tabular-nums'] },
  appbarTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, letterSpacing: em(28, -0.03) },
  secTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, letterSpacing: em(16, -0.01) },
  /** The plain-language sentence at the top of overview screens (`p.display`). */
  sentence: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 29, letterSpacing: em(22, -0.02) },

  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: em(30, -0.03) },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26.5, letterSpacing: em(22, -0.02) },
  heading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  subheading: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: em(11, 0.12), textTransform: 'uppercase' },
  number: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, letterSpacing: em(26, -0.03), fontVariant: ['tabular-nums'] },
};

const DISPLAY_FACES: TextVariant[] = ['hero', 'h1', 'h2', 'kpi', 'kpiSm', 'appbarTitle', 'sentence', 'display', 'title', 'number'];
const MUTED: TextVariant[] = ['eyebrow', 'kicker', 'caption', 'overline'];
const HEADERS: TextVariant[] = ['hero', 'h1', 'h2', 'appbarTitle', 'display', 'title'];

type ColorName = keyof Palette;
type Weight = 400 | 500 | 600 | 650 | 700 | 800;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ColorName;
  rawColor?: string;
  align?: TextStyle['textAlign'];
  /** `.w6` / `.w7` / `.w8` on UI text. Ignored for display faces. */
  weight?: Weight;
  /** Tabular figures (`.num`). */
  num?: boolean;
};

export function Text({ variant = 'body', color, rawColor, align, weight, num, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const density = useContext(DensityContext);
  const base: TextStyle =
    variant === 'body'
      ? { fontFamily: fonts.medium, fontSize: density === 'web' ? 14 : 15, lineHeight: density === 'web' ? 21 : 22.5 }
      : VARIANTS[variant];
  const defaultColor: ColorName = MUTED.includes(variant) ? 'muted' : 'ink';
  const isDisplay = DISPLAY_FACES.includes(variant);
  const isHeader = HEADERS.includes(variant);
  return (
    <RNText
      accessibilityRole={isHeader ? 'header' : undefined}
      maxFontSizeMultiplier={isHeader ? 1.3 : 1.6}
      style={[
        base,
        weight && !isDisplay ? { fontFamily: uiFont(weight) } : null,
        num ? { fontVariant: ['tabular-nums'] } : null,
        { color: rawColor ?? colors[color ?? defaultColor], textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
