import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { pointer } from './css';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Badge } from './Pill';
import { Text } from './Text';

export type DockItem = { name: string; label: string; icon: IconName; badge?: number };

/** Height reserved at the bottom of a scrolling screen so content clears the floating dock. */
export const DOCK_CLEARANCE = 128;

/**
 * `.dock`: the floating tab bar. Only routes listed in `items` get a tab; every other route in the
 * navigator is a secondary screen that keeps the dock visible with no tab highlighted.
 * A screen hides the dock with `options={{ tabBarStyle: { display: 'none' } }}`.
 */
export function makeDock(items: DockItem[]) {
  return function DockBar(props: BottomTabBarProps) {
    return <Dock {...props} items={items} />;
  };
}

function Dock({ state, descriptors, navigation, items }: BottomTabBarProps & { items: DockItem[] }) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = state.routes[state.index];
  const focusedOptions = descriptors[focused.key]?.options as { tabBarStyle?: { display?: string } } | undefined;
  if (focusedOptions?.tabBarStyle?.display === 'none') return null;

  return (
    <View
      style={[
        { pointerEvents: 'box-none' },styles.wrap, { bottom: Math.max(insets.bottom, 12) + (Platform.OS === 'web' ? 10 : 0) }]}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.dock,
          {
            backgroundColor: colors.dock,
            boxShadow:
              scheme === 'dark'
                ? `0 18px 40px -18px rgba(0,0,0,0.7), 0 0 0 1px ${colors.line}`
                : `0 18px 40px -16px rgba(30,40,90,0.30), 0 0 0 1px ${colors.line}`,
          },
        ]}>
        {items.map((item) => {
          const route = state.routes.find((r) => r.name === item.name);
          if (!route) return null;
          const active = focused.name === item.name;
          const fg = active ? colors.dockOnInk : colors.dockInk;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.badge ? `${item.label}, ${item.badge} unread` : item.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              style={[styles.tab, pointer, active && { backgroundColor: colors.dockOn }]}>
              <View>
                <Icon name={item.icon} size={ICON_SIZE.dock} rawColor={fg} />
                {item.badge ? <Badge value={item.badge > 99 ? '99+' : item.badge} style={styles.badge} /> : null}
              </View>
              <Text rawColor={fg} numberOfLines={1} style={styles.label}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, alignItems: 'center' },
  dock: {
    alignSelf: 'stretch',
    maxWidth: 480,
    width: '100%',
    marginHorizontal: 'auto',
    height: 70,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tab: { width: 64, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 12, letterSpacing: 0.1 },
  badge: { position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, paddingHorizontal: 4 },
});
