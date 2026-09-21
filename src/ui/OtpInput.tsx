import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

import { Text } from './Text';

/** Six boxes backed by one hidden input, so SMS autofill and paste both work. */
export function OtpInput({ value, onChange, length = 6, autoFocus = true, error }: { value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean; error?: boolean }) {
  const { colors } = useTheme();
  const input = useRef<TextInput>(null);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none" style={styles.row}>
      {digits.map((digit, index) => {
        const active = index === Math.min(value.length, length - 1);
        return (
          <View
            key={index}
            style={[
              styles.box,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.danger : active ? colors.primary : colors.border,
                borderWidth: active ? 2 : 1,
              },
            ]}>
            <Text variant="title" style={styles.digit}>
              {digit.trim()}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        autoFocus={autoFocus}
        maxLength={length}
        accessibilityLabel="One-time code"
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: { flex: 1, maxWidth: 56, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  digit: { fontFamily: fonts.display, fontSize: 26 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
