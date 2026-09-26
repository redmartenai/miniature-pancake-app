import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { DOCK_CLEARANCE } from './Dock';

type ScreenProps = {
  children: ReactNode;
  /** Header rendered above the scroll view (usually an <AppBar />). */
  header?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  padded?: boolean;
  /** Gap between sections (`.screen` uses 16; home screens use 18). */
  gap?: number;
  /** Leave room for the floating dock. */
  dock?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Sticky bar pinned to the bottom (submit bars, chat composer). */
  footer?: ReactNode;
};

/** `.screen`: phone page. Padding 8/20, sections 16 apart, dock clearance at the bottom. */
export function Screen({
  children,
  header,
  scroll = true,
  refreshing = false,
  onRefresh,
  edges,
  padded = true,
  gap = 16,
  dock = false,
  contentStyle,
  footer,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = dock ? DOCK_CLEARANCE : footer ? spacing.lg : insets.bottom + spacing.xxl;
  const inner = [styles.inner, { gap }, padded && styles.padded, contentStyle];
  // With an AppBar the header owns the top inset; without one, keep the legacy safe-area edge.
  const safeEdges: Edge[] = edges ?? (header ? [] : ['top']);
  return (
    <SafeAreaView edges={safeEdges} style={[styles.root, { backgroundColor: colors.canvas }]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined
          }>
          <View style={inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.fill, ...inner]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.line, backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.sm) + 4 },
          ]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : undefined,
    alignSelf: 'center',
  },
  padded: { paddingHorizontal: 20, paddingTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  footerInner: { width: '100%', maxWidth: Platform.OS === 'web' ? 560 : undefined, alignSelf: 'center' },
});
