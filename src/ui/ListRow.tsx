import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Tone } from '@/theme/tokens';

import { useSurface } from './Card';
import { pointer } from './css';
import { TileIcon, type TileTone } from './Data';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Text } from './Text';

type ListRowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  iconTone?: TileTone | Tone;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  /** Horizontal padding inside the row (0 when the parent card is already padded). */
  inset?: number;
  /** Vertical padding (`.list-item` is 14). */
  py?: number;
  /** Bold/unread styling for the title. */
  strong?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const TONE_MAP: Partial<Record<Tone, TileTone>> = { primary: 'brand', success: 'ok', warning: 'warn', danger: 'bad', accent: 'peach' };

/** `.list-item`: tile icon, two lines of text, trailing content, hairline between rows. */
export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'brand',
  left,
  right,
  onPress,
  chevron = !!onPress,
  last,
  inset = 16,
  py = 14,
  strong = true,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ListRowProps) {
  const { colors } = useTheme();
  const surface = useSurface();
  const tone = (TONE_MAP[iconTone as Tone] ?? iconTone) as TileTone;
  const rule = surface.kind === 'widget' ? colors.pHr : colors.line;
  const content = (
    <View style={[styles.row, { paddingHorizontal: inset, paddingVertical: py }, !last && { borderBottomWidth: 1, borderBottomColor: rule }, style]}>
      {left ?? (icon ? <TileIcon icon={icon} tone={tone} /> : null)}
      <View style={styles.text}>
        {typeof title === 'string' ? (
          <Text variant="sm" weight={strong ? 700 : 600} color="ink" numberOfLines={1} style={{ fontSize: 14 }}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <Text variant="xs" color="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.faint} /> : null}
    </View>
  );
  if (!onPress) return content;
  const label = accessibilityLabel ?? [title, subtitle].filter((v) => typeof v === 'string').join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || undefined}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [pointer, pressed && { backgroundColor: surface.kind === 'widget' ? colors.pTrack : colors.subtle }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
