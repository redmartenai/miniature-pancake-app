import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, toneColors, type Tone } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

type ToastMessage = { id: number; text: string; tone: Tone };
const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const counter = useRef(0);
  const show = useCallback((text: string, tone: Tone = 'success') => {
    counter.current += 1;
    setMessage({ id: counter.current, text, tone });
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? <ToastView key={message.id} message={message} onDone={() => setMessage(null)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ message, onDone }: { message: ToastMessage; onDone: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const { fg } = toneColors(colors, message.tone);
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(3200),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [opacity, onDone]);
  return (
    <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 72 }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { opacity, backgroundColor: colors.ink }]}>
        <Icon name={message.tone === 'danger' ? 'alert-circle' : 'checkmark-circle'} size={20} rawColor={message.tone === 'danger' ? '#F2A094' : fg === colors.primary ? '#8FD3B8' : fg} />
        <Text variant="bodyStrong" rawColor={colors.bg} style={styles.text}>
          {message.text}
        </Text>
      </Animated.View>
    </View>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    maxWidth: 560,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flexShrink: 1, fontSize: 14 },
});
