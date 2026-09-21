import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { noWebFocusRing } from './webStyles';

type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  prefix?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, icon, prefix, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // The whole field is the focus indicator (the browser's ring would only wrap the inner input).
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={styles.wrap}>
      <Text variant="label" color="text">
        {label}
      </Text>
      <View style={[styles.field, multiline && styles.multiline, { backgroundColor: colors.surface, borderColor }]}>
        {icon ? <Icon name={icon} size={18} rawColor={focused ? colors.primary : colors.textMuted} /> : null}
        {prefix ? (
          <Text variant="bodyStrong" color="textMuted">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          style={[styles.input, { color: colors.ink }, multiline && styles.inputMultiline, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
      </View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.xs },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingVertical: 10,
    ...noWebFocusRing,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
});
