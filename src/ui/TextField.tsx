import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { pointer } from './css';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Kbd } from './Data';
import { Text } from './Text';
import { noWebFocusRing } from './webStyles';

type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  prefix?: string;
  /** Right-aligned text next to the label (e.g. a character count "35/80"). */
  labelRight?: ReactNode;
  /** Content inside the input box, after the text (e.g. a Show button). */
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/** `.field` > `.label` + `.input` / `.input-wrap` + `.hint`. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, icon, prefix, labelRight, trailing, containerStyle, style, multiline, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.bad : focused ? colors.brand : colors.lineStrong;
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label || labelRight ? (
        <View style={styles.labelRow}>
          {label ? (
            <Text rawColor={colors.ink2} style={styles.label}>
              {label}
            </Text>
          ) : null}
          {labelRight}
        </View>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          { backgroundColor: editable ? colors.surface : colors.subtle, borderColor },
          focused && !error && { boxShadow: `0 0 0 3px ${colors.brandSoft}` },
        ]}>
        {icon ? <Icon name={icon} size={ICON_SIZE.md} rawColor={colors.muted} /> : null}
        {prefix ? (
          <Text rawColor={colors.ink2} style={{ fontFamily: fonts.semibold, fontSize: 14 }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          editable={editable}
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
        {trailing}
      </View>
      {error ? (
        <Text variant="xs" color="bad" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="xs" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

/** `.search`: sunken search box, optionally with a ⌘K hint. */
export function Search({
  value,
  onChangeText,
  placeholder,
  shortcut,
  style,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  shortcut?: string;
  style?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: colors.sunken, borderColor: colors.line }, style]}>
      <Icon name="search" size={ICON_SIZE.sm} rawColor={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, { color: colors.ink, height: '100%' }]}
      />
      {shortcut ? <Kbd>{shortcut}</Kbd> : null}
    </View>
  );
}

/** `.check`. `decorative`: just the box, for a row that is itself the checkbox. */
export function Checkbox({ checked, onChange, label, disabled, decorative }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean; decorative?: boolean }) {
  const { colors } = useTheme();
  if (decorative)
    return (
      <View style={[styles.check, { backgroundColor: checked ? colors.brand : colors.surface, borderColor: checked ? colors.brand : colors.lineStrong, opacity: disabled ? 0.5 : 1 }]}>
        {checked ? <Icon name="check" size={12} rawColor={colors.onBrand} bold /> : null}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange?.(!checked)}
      style={[
        styles.check,
        pointer,
        {
          backgroundColor: checked ? colors.brand : colors.surface,
          borderColor: checked ? colors.brand : colors.lineStrong,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      {checked ? <Icon name="check" size={12} rawColor={colors.onBrand} bold /> : null}
    </Pressable>
  );
}

/** `.switch`: 44×26 track with a sliding knob. */
/** `decorative`: just the visual, for a whole row that is itself the switch (avoids nested buttons on web). */
export function Switch({ value, onChange, label, disabled, decorative }: { value: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean; decorative?: boolean }) {
  const { colors } = useTheme();
  if (decorative)
    return (
      <View style={[styles.switch, { backgroundColor: value ? colors.brand : colors.lineStrong, opacity: disabled ? 0.5 : 1 }]}>
        <View style={[styles.knob, { transform: [{ translateX: value ? 18 : 0 }] }]} />
      </View>
    );
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange?.(!value)}
      style={[styles.switch, pointer, { backgroundColor: value ? colors.brand : colors.lineStrong, opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.knob, { transform: [{ translateX: value ? 18 : 0 }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16 },
  field: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.medium,
    fontSize: 14,
    paddingVertical: 10,
    ...noWebFocusRing,
  },
  inputMultiline: { minHeight: 72, paddingVertical: 0, lineHeight: 21, textAlignVertical: 'top' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  check: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  switch: { width: 44, height: 26, borderRadius: 999, padding: 3 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' },
});
