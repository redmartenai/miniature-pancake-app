import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { Text } from './Text';

/** Bottom sheet for short choices and confirmations (works the same on phones and the web). */
export function Sheet({ visible, onClose, title, message, children }: { visible: boolean; onClose: () => void; title: string; message?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text variant="title">{title}</Text>
        {message ? (
          <Text variant="body" color="textMuted">
            {message}
          </Text>
        ) : null}
        <View style={styles.body}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.xs },
  body: { gap: spacing.sm, marginTop: spacing.sm },
});
