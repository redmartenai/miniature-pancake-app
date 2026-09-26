import { Platform, type ViewStyle } from 'react-native';

/**
 * CSS background-image (gradients) on every platform. React Native renders
 * `experimental_backgroundImage` natively; react-native-web passes `backgroundImage` to the DOM.
 */
export function bgImage(css: string, extra?: { size?: string; position?: string; repeat?: string }): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      backgroundImage: css,
      ...(extra?.size ? { backgroundSize: extra.size } : null),
      ...(extra?.position ? { backgroundPosition: extra.position } : null),
      ...(extra?.repeat ? { backgroundRepeat: extra.repeat } : null),
    } as ViewStyle;
  }
  return {
    experimental_backgroundImage: css,
    ...(extra?.size ? { experimental_backgroundSize: extra.size } : null),
    ...(extra?.position ? { experimental_backgroundPosition: extra.position } : null),
    ...(extra?.repeat ? { experimental_backgroundRepeat: extra.repeat } : null),
  } as ViewStyle;
}

/** `--shadow` from eduflow.css. */
export function cardShadow(scheme: 'light' | 'dark'): ViewStyle {
  return { boxShadow: scheme === 'dark' ? '0 12px 30px -18px rgba(0,0,0,0.7)' : '0 1px 2px rgba(28,27,34,0.05)' };
}

/** `--shadow-lg` from eduflow.css. */
export function cardShadowLg(scheme: 'light' | 'dark'): ViewStyle {
  return {
    boxShadow:
      scheme === 'dark'
        ? '0 28px 56px -24px rgba(0,0,0,0.8)'
        : '0 2px 6px rgba(40,32,20,0.05), 0 28px 60px -24px rgba(40,32,20,0.24)',
  };
}

/** Web-only: pointer cursor on pressables. */
export const pointer: ViewStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};
