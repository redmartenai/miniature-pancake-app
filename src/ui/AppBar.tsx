import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { IconButton } from './IconButton';
import { Text } from './Text';

/** The moon/sun button that sits in every app bar. */
export function ThemeToggle({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const { scheme, toggleScheme } = useTheme();
  return (
    <IconButton
      icon={scheme === 'dark' ? 'sun' : 'moon'}
      label={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onPress={toggleScheme}
      size={size}
    />
  );
}

/**
 * `.appbar`: phone header. Status-bar inset + 14px on top (the design's 58px), 20px sides.
 * `subtitle` is the small line above the title; `titleVariant="h2"` for form screens.
 */
export function AppBar({
  title,
  subtitle,
  back,
  left,
  actions,
  theme = true,
  titleVariant = 'appbarTitle',
  titleNode,
  align = 'center',
  style,
}: {
  title?: string;
  subtitle?: string;
  /** `true` → router.back(); or a custom handler. */
  back?: boolean | (() => void);
  /** Custom leading node (avatar, fan…), shown instead of a back button. */
  left?: ReactNode;
  actions?: ReactNode;
  theme?: boolean;
  titleVariant?: 'appbarTitle' | 'h2';
  /** Replace the title block entirely. */
  titleNode?: ReactNode;
  align?: 'center' | 'flex-start';
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const onBack = typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 14, alignItems: align, backgroundColor: colors.canvas }, style]}>
      {back ? <IconButton icon="arrowLeft" label="Back" onPress={onBack} size="lg" /> : left}
      <View style={styles.titles}>
        {titleNode ?? (
          <>
            {subtitle ? (
              <Text variant="xs" color="muted" weight={600} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            {title ? (
              <Text variant={titleVariant} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            ) : null}
          </>
        )}
      </View>
      {theme ? <ThemeToggle /> : null}
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
  titles: { flex: 1, minWidth: 0, gap: 2 },
});
