import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { cardShadowLg } from './css';
import { Text } from './Text';

/** `.sheet`: bottom sheet with a grabber (28px top corners) over the design's scrim. */
export function Sheet({
  visible,
  onClose,
  title,
  message,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, borderColor: colors.line, paddingBottom: insets.bottom + 20 },
          cardShadowLg(scheme),
        ]}
        accessibilityViewIsModal>
        <View style={[styles.grabber, { backgroundColor: colors.lineStrong }]} />
        <Text variant="h2">{title}</Text>
        {message ? (
          <Text variant="body" color="ink2">
            {message}
          </Text>
        ) : null}
        {children ? <View style={styles.body}>{children}</View> : null}
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
    // Centred on wide screens (an absolute box needs auto margins, not alignSelf).
    marginHorizontal: 'auto',
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  grabber: { width: 40, height: 5, borderRadius: 999, alignSelf: 'center', marginBottom: 8 },
  body: { gap: 12, marginTop: 4 },
});
