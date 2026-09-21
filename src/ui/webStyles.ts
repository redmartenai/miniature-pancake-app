import { Platform, type TextStyle } from 'react-native';

/**
 * Removes the browser's focus ring from inputs that draw their own focus state (a coloured border).
 * It has to be outline-style "none": Chrome ignores outline-width while the style is "auto".
 * React Native's types only list solid/dotted/dashed, but react-native-web passes the value to CSS.
 */
export const noWebFocusRing: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};
