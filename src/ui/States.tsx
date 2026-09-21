import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function EmptyState({ icon = 'sparkles-outline', title, message, action }: { icon?: IconName; title: string; message?: string; action?: { label: string; onPress: () => void } }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={26} color="primary" />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textMuted" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {action ? <Button title={action.label} onPress={action.onPress} variant="soft" /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const message = error instanceof ApiError ? error.message : t('common.somethingWrong');
  const offline = error instanceof ApiError && error.isNetwork;
  return (
    <EmptyState
      icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
      title={offline ? t('common.offlineBanner') : t('common.somethingWrong')}
      message={offline ? undefined : message}
      action={onRetry ? { label: t('common.retry'), onPress: onRetry } : undefined}
    />
  );
}

/** Soft pulsing placeholder while content loads. */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: DimensionValue; style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, opacity }, style]} />;
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={i === 0 ? 132 : 84} style={{ borderRadius: radius.lg }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  message: { maxWidth: 320 },
});
