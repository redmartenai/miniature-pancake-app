import { router, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Icon, ICON_SIZE, IconButton, LogoMark, pointer, Text, ThemeToggle, type IconName } from '@/ui';

const NAV: { key: 'overview' | 'schools' | 'register'; href: string; icon: IconName }[] = [
  { key: 'overview', href: '/platform', icon: 'grid' },
  { key: 'schools', href: '/platform/schools', icon: 'school' },
  { key: 'register', href: '/platform/schools/new', icon: 'plus' },
];

/** The EduFlow team's frame: the console's sidebar + top bar, without any school. */
export function PlatformShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pathname = usePathname();
  const user = useSession((s) => s.user);
  const active = (href: string) =>
    href === '/platform'
      ? pathname === '/platform'
      : href === '/platform/schools'
        ? pathname.startsWith('/platform/schools') && pathname !== '/platform/schools/new'
        : pathname === href;

  return (
    <View style={[styles.shell, { backgroundColor: colors.canvas }]}>
      <View style={[styles.sidebar, { backgroundColor: colors.subtle, borderRightColor: colors.line }]}>
        <View style={{ gap: 20, flex: 1 }}>
          <View style={styles.brandmark}>
            <LogoMark size={30} />
            <Text style={[styles.word, { color: colors.ink }]}>{t('platform.brand')}</Text>
          </View>
          <View style={[styles.area, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Icon name="shield" size={ICON_SIZE.md} rawColor={colors.brandInk} />
            <Text variant="sm" weight={700}>
              {t('platform.area')}
            </Text>
          </View>
          <View style={{ gap: 2 }} accessibilityRole={'navigation' as never}>
            {NAV.map((item) => {
              const on = active(item.href);
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="link"
                  aria-current={on ? 'page' : undefined}
                  onPress={() => router.navigate(item.href as Href)}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.navItem,
                    pointer,
                    { backgroundColor: on ? colors.brandSoft : hovered ? colors.sunken : 'transparent' },
                  ]}>
                  <Icon name={item.icon} size={ICON_SIZE.md} rawColor={on ? colors.brandInk : colors.ink2} />
                  <Text style={[styles.navText, { color: on ? colors.brandInk : colors.ink2 }]}>{t(`platform.nav.${item.key}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Avatar initials={user?.initials ?? ''} size={34} tone={1} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {user?.full_name ?? ''}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {t('platform.team')}
            </Text>
          </View>
          <IconButton
            icon="logout"
            label={t('platform.signOut')}
            variant="bare"
            size="sm"
            onPress={() => void useSession.getState().signOut()}
          />
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[styles.topbar, { borderBottomColor: colors.line }]}>
          <View style={{ flex: 1 }} />
          <ThemeToggle size="md" />
        </View>
        <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 264, borderRightWidth: 1, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 20 },
  brandmark: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  word: { fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: -0.63 },
  area: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 38, paddingHorizontal: 12, borderRadius: 11 },
  navText: { fontFamily: fonts.semibold, fontSize: 13.5 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  topbar: { height: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 32, borderBottomWidth: 1 },
});
