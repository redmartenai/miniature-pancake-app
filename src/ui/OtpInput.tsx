import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { Text } from './Text';

/**
 * Six boxes backed by one hidden input, so SMS autofill and paste both work.
 * Boxes are 50×60 with a 14px radius; the active box gets the brand ring and a blinking caret.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
}) {
  const { colors } = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(autoFocus);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');
  const activeIndex = Math.min(value.length, length - 1);

  const caret = useSharedValue(1);
  useEffect(() => {
    caret.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 500 })), -1);
  }, [caret]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none" style={styles.row}>
      {digits.map((digit, index) => {
        const active = focused && index === activeIndex && value.length < length;
        return (
          <View
            key={index}
            accessibilityLabel={`Digit ${index + 1}`}
            style={[
              styles.box,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.bad : active ? colors.brand : colors.lineStrong,
              },
              active && !error && { boxShadow: `0 0 0 3px ${colors.brandSoft}` },
            ]}>
            {digit.trim() ? (
              <Text rawColor={colors.ink} num style={styles.digit}>
                {digit}
              </Text>
            ) : active ? (
              <Animated.View style={[styles.caret, { backgroundColor: colors.brand }, caretStyle]} />
            ) : null}
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  box: { width: 50, height: 60, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  digit: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  caret: { width: 2, height: 26, borderRadius: 2 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
