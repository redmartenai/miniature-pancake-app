import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { Icon, Text } from '@/ui';

import { BrandMark } from './BrandMark';

/** Layout shared by the sign-in steps: brand mark, step indicator, title and form. */
export function AuthShell({
  step,
  title,
  subtitle,
  children,
  footer,
  brandColor,
  canGoBack,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  brandColor?: string;
  canGoBack?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <View style={styles.topRow}>
              {canGoBack ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12} style={styles.back}>
                  <Icon name="chevron-back" size={24} color="primary" />
                </Pressable>
              ) : (
                <View style={styles.back} />
              )}
              <View style={styles.steps} accessibilityLabel={`Step ${step} of 3`}>
                {[1, 2, 3].map((n) => (
                  <View key={n} style={[styles.stepDot, { backgroundColor: n <= step ? (brandColor ?? colors.primary) : colors.border, width: n === step ? 22 : 8 }]} />
                ))}
              </View>
              <View style={styles.back} />
            </View>
            <BrandMark color={brandColor ?? colors.primary} />
            <View style={styles.heading}>
              <Text variant="display">{title}</Text>
              {subtitle ? (
                <Text variant="body" color="textMuted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  inner: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: spacing.lg, gap: spacing.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 32, height: 32, justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { height: 8, borderRadius: 4 },
  heading: { gap: spacing.xs },
  form: { gap: spacing.md },
  footer: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
});
