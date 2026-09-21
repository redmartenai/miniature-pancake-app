import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  padded?: boolean;
  contentStyle?: ViewStyle;
  footer?: ReactNode;
};

/** Page container: safe areas, pull-to-refresh, and a readable max width on the web. */
export function Screen({ children, scroll = true, refreshing = false, onRefresh, edges = ['top'], padded = true, contentStyle, footer }: ScreenProps) {
  const { colors } = useTheme();
  const inner = [styles.inner, padded && styles.padded, contentStyle];
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
          }>
          <View style={inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.fill, ...inner]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  inner: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 760 : undefined,
    alignSelf: 'center',
    gap: spacing.md,
  },
  padded: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
