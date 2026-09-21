import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, type Palette } from '@/theme/tokens';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'number';

const VARIANTS: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  title: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 29, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23 },
  subheading: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17 },
  overline: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
  number: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31 },
};

type ColorName = keyof Palette;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ColorName;
  rawColor?: string;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', color, rawColor, align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const defaultColor: ColorName =
    variant === 'display' || variant === 'title' || variant === 'number' || variant === 'heading' ? 'ink' : variant === 'caption' || variant === 'overline' ? 'textMuted' : 'text';
  const isHeader = variant === 'display' || variant === 'title';
  return (
    <RNText
      accessibilityRole={isHeader ? 'header' : undefined}
      maxFontSizeMultiplier={isHeader ? 1.3 : 1.6}
      style={[VARIANTS[variant], { color: rawColor ?? colors[color ?? defaultColor], textAlign: align }, style]}
      {...rest}
    />
  );
}
