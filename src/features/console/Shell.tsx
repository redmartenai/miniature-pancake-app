import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { api } from '@/api/endpoints';
import { formatDate, relativeTime } from '@/lib/format';
import { useActiveMembership, useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Avatar,
  Badge,
  Button,
  cardShadow,
  cardShadowLg,
  Icon,
  ICON_SIZE,
  IconButton,
  Kbd,
  LogoMark,
  pointer,
  Text,
  ThemeToggle,
  TileIcon,
  type IconName,
} from '@/ui';
import { noWebFocusRing } from '@/ui/webStyles';

import { consoleApi, useConsoleContext, useConsoleQuery, type SearchHit } from './api';

type NavKey =
  | 'dashboard'
  | 'students'
  | 'admissions'
  | 'staff'
  | 'academics'
  | 'timetable'
  | 'exams'
  | 'attendance'
  | 'fees'
  | 'transport'
  | 'approvals'
  | 'communication'
  | 'documents'
  | 'reports'
  | 'settings';

const NAV: { group?: 'people' | 'academics' | 'operations' | 'engage'; items: { key: NavKey; icon: IconName }[] }[] = [
  { items: [{ key: 'dashboard', icon: 'grid' }] },
  {
    group: 'people',
    items: [
      { key: 'students', icon: 'users' },
      { key: 'admissions', icon: 'userPlus' },
      { key: 'staff', icon: 'briefcase' },
    ],
  },
  {
    group: 'academics',
    items: [
      { key: 'academics', icon: 'cap' },
      { key: 'timetable', icon: 'calendar' },
      { key: 'exams', icon: 'clipboard' },
      { key: 'attendance', icon: 'calendarCheck' },
    ],
  },
  {
    group: 'operations',
    items: [
      { key: 'fees', icon: 'wallet' },
      { key: 'transport', icon: 'busSimple' },
      { key: 'approvals', icon: 'checkCircle' },
    ],
  },
  {
    group: 'engage',
    items: [
      { key: 'communication', icon: 'speaker' },
      { key: 'documents', icon: 'document' },
      { key: 'reports', icon: 'chart' },
    ],
  },
];

export function consoleHref(key: NavKey): Href {
  return (key === 'dashboard' ? '/console' : `/console/${key}`) as Href;
}

/** Below this width the sidebar becomes a drawer behind the menu button. */
export const CONSOLE_WIDE = 1180;

/** The console frame: sidebar (264) + top bar (72) + the page. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= CONSOLE_WIDE;
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  useEffect(() => setDrawer(false), [pathname]);

  return (
    <View style={[styles.shell, { backgroundColor: colors.canvas }]}>
      {wide ? <Sidebar /> : null}
      <View style={styles.main}>
        <Topbar onMenu={wide ? undefined : () => setDrawer(true)} />
        <View style={styles.page}>{children}</View>
      </View>
      {!wide && drawer ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="close"
            onPress={() => setDrawer(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          />
          <View style={[styles.drawer, cardShadowLg('light')]}>
            <Sidebar onClose={() => setDrawer(false)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const pathname = usePathname();
  const school = useActiveSchool();
  const membership = useActiveMembership();
  const user = useSession((s) => s.user);
  const ctx = useConsoleContext();
  const active = (key: NavKey) => (key === 'dashboard' ? pathname === '/console' : pathname.startsWith(`/console/${key}`));
  const campus = ctx.data?.campus ?? school?.campus;
  const year = ctx.data?.academic_year ?? school?.academic_year;

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.subtle, borderRightColor: colors.line }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sidebarInner} showsVerticalScrollIndicator={false}>
        <View style={styles.brandmark}>
          <LogoMark size={30} />
          <Text style={[styles.word, { color: colors.ink }]}>{t('console.shell.brand')}</Text>
          {onClose ? (
            <View style={{ marginLeft: 'auto' }}>
              <IconButton icon="close" label={t('console.shell.closeMenu')} variant="bare" size="sm" onPress={onClose} />
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('console.shell.switchSchool')}
          onPress={() => router.push('/settings')}
          style={[styles.switch, pointer, { backgroundColor: colors.surface, borderColor: colors.line }, cardShadow(scheme)]}>
          <TileIcon icon="school" size="sm" />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {school?.name ?? ''}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {[campus, year].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Icon name="sort" size={ICON_SIZE.sm} color="muted" />
        </Pressable>

        <View
          accessibilityRole={Platform.OS === 'web' ? ('navigation' as never) : undefined}
          accessibilityLabel={t('console.shell.primaryNav')}
          style={styles.nav}>
          {NAV.map((section, i) => (
            <View key={section.group ?? i} style={styles.navGroup}>
              {section.group ? (
                <Text style={[styles.navLabel, { color: colors.muted }]}>{t(`console.shell.group.${section.group}`)}</Text>
              ) : null}
              {section.items.map((item) => (
                <NavItem
                  key={item.key}
                  label={t(`console.shell.nav.${item.key}`)}
                  icon={item.icon}
                  active={active(item.key)}
                  badge={item.key === 'approvals' ? ctx.data?.approvals : undefined}
                  href={consoleHref(item.key)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ gap: 10, paddingTop: 12 }}>
        <NavItem label={t('console.shell.nav.settings')} icon="sliders" active={active('settings')} href={consoleHref('settings')} />
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Avatar initials={user?.initials ?? ''} size={34} tone={1} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {user?.full_name ?? ''}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {membership?.roles.find((r) => r.role === 'principal')?.title || t('roles.principal')}
            </Text>
          </View>
          <IconButton
            icon="logout"
            label={t('console.shell.signOut')}
            variant="bare"
            size="sm"
            onPress={() => void useSession.getState().signOut()}
          />
        </View>
      </View>
    </View>
  );
}

function NavItem({ label, icon, active, badge, href }: { label: string; icon: IconName; active: boolean; badge?: number; href: Href }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      aria-current={active ? 'page' : undefined}
      onPress={() => router.navigate(href)}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.navItem,
        pointer,
        { backgroundColor: active ? colors.brandSoft : hovered ? colors.sunken : 'transparent' },
      ]}>
      <Icon name={icon} size={ICON_SIZE.md} rawColor={active ? colors.brandInk : colors.ink2} />
      <Text style={[styles.navText, { color: active ? colors.brandInk : colors.ink2 }]} numberOfLines={1}>
        {label}
      </Text>
      {badge ? <Badge value={badge > 99 ? '99+' : badge} tone="bad" style={{ marginLeft: 'auto' }} /> : null}
    </Pressable>
  );
}

function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const ctx = useConsoleContext();
  const [bell, setBell] = useState(false);
  const pathname = usePathname();
  useEffect(() => setBell(false), [pathname]);
  const term = ctx.data?.term;
  const dateLine = ctx.data
    ? term
      ? t('console.shell.dateTerm', { date: formatDate(ctx.data.today, { weekday: true, year: true }), term: term.name, week: term.week })
      : formatDate(ctx.data.today, { weekday: true, year: true })
    : '';
  const unread = ctx.data?.unread_notifications ?? 0;

  return (
    <View style={[styles.topbar, { backgroundColor: colors.canvas, borderBottomColor: colors.line }]}>
      {onMenu ? <IconButton icon="menu" label={t('console.shell.menu')} onPress={onMenu} /> : null}
      <GlobalSearch width={width >= 1300 ? 440 : width >= 900 ? 320 : 220} />
      <View style={{ flex: 1 }} />
      {width >= 1000 && dateLine ? (
        <Text variant="sm" color="muted" weight={600} numberOfLines={1}>
          {dateLine}
        </Text>
      ) : null}
      <ThemeToggle size="md" />
      <IconButton
        icon="chat"
        label={t('console.shell.messages')}
        onPress={() => router.navigate('/console/communication?tab=messages' as Href)}
      />
      <View>
        <IconButton
          icon="bell"
          label={unread ? t('console.shell.notificationsUnread', { count: unread }) : t('console.shell.notifications')}
          ping={unread > 0}
          onPress={() => setBell((v) => !v)}
        />
        {bell ? <NotificationsPanel onClose={() => setBell(false)} /> : null}
      </View>
      <Button
        title={t('console.shell.newAnnouncement')}
        icon="plus"
        variant="secondary"
        onPress={() => router.navigate('/console/communication?compose=1' as Href)}
      />
    </View>
  );
}

function GlobalSearch({ width }: { width: number }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const input = useRef<TextInput>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(id);
  }, [q]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const results = useConsoleQuery(['search', debounced], () => consoleApi.search(debounced), { enabled: debounced.length >= 2 });
  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ('');
    if (hit.kind === 'student') router.navigate(`/console/students/${hit.id}` as Href);
    else if (hit.kind === 'staff') router.navigate(`/console/staff?person=${hit.id}` as Href);
    else if (hit.kind === 'receipt') router.navigate(`/console/fees?receipt=${hit.id}` as Href);
    else router.navigate(`/console/students?class=${hit.id}` as Href);
  };
  const icon: Record<SearchHit['kind'], IconName> = { student: 'user', staff: 'briefcase', receipt: 'receipt', class: 'users' };
  const items = results.data?.items ?? [];

  return (
    <View style={{ width, zIndex: 20 }}>
      <View style={[styles.search, { backgroundColor: colors.sunken, borderColor: colors.line }]}>
        <Icon name="search" size={ICON_SIZE.sm} rawColor={colors.muted} />
        <TextInput
          ref={input}
          value={q}
          onChangeText={(v) => {
            setQ(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onSubmitEditing={() => items[0] && go(items[0])}
          placeholder={t('console.shell.search')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('console.shell.search')}
          style={[styles.searchInput, { color: colors.ink }, noWebFocusRing]}
        />
        <Kbd>⌘K</Kbd>
      </View>
      {open && q.trim().length > 0 ? (
        <View
          style={[
            styles.pop,
            { left: 0, backgroundColor: colors.surface, borderColor: colors.line, width: Math.max(width, 380) },
            cardShadowLg(scheme),
          ]}>
          {q.trim().length < 2 ? (
            <Text variant="sm" color="muted" style={{ padding: 12 }}>
              {t('console.shell.searchHint')}
            </Text>
          ) : items.length === 0 && !results.isFetching ? (
            <Text variant="sm" color="muted" style={{ padding: 12 }}>
              {t('console.shell.searchEmpty', { q: q.trim() })}
            </Text>
          ) : (
            items.map((hit) => (
              <Pressable
                key={`${hit.kind}${hit.id}`}
                onPress={() => go(hit)}
                accessibilityRole="button"
                style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.hit,
                  pointer,
                  hovered && { backgroundColor: colors.subtle },
                ]}>
                <TileIcon icon={icon[hit.kind]} size="sm" tone="neutral" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="sm" weight={700} numberOfLines={1}>
                    {hit.title}
                  </Text>
                  <Text variant="xs" color="muted" numberOfLines={1}>
                    {hit.detail}
                  </Text>
                </View>
                <Text variant="xxs" color="muted" weight={700}>
                  {t(`console.shell.kind.${hit.kind}`)}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const client = useQueryClient();
  const schoolId = useSession((s) => s.schoolId);
  const list = useQuery({ queryKey: ['notifications', schoolId], queryFn: api.notifications });
  const items = (list.data?.items ?? []).slice(0, 8);
  const markAll = async () => {
    await api.markNotificationsRead();
    await client.invalidateQueries({ queryKey: ['notifications'] });
    await client.invalidateQueries({ queryKey: ['console'] });
  };
  return (
    <View style={[styles.pop, styles.bellPop, { backgroundColor: colors.surface, borderColor: colors.line }, cardShadowLg(scheme)]}>
      <View style={styles.popHead}>
        <Text variant="h4">{t('console.shell.notifications')}</Text>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {items.some((n) => !n.read) ? (
            <Button title={t('console.shell.markAllRead')} variant="ghost" size="sm" onPress={() => void markAll()} />
          ) : null}
          <IconButton icon="close" label={t('console.shell.closeMenu')} variant="bare" size="sm" onPress={onClose} />
        </View>
      </View>
      {items.length === 0 ? (
        <Text variant="sm" color="muted" style={{ padding: 14 }}>
          {t('console.shell.noNotifications')}
        </Text>
      ) : (
        items.map((n) => (
          <View key={n.id} style={[styles.note, { borderTopColor: colors.line }]}>
            {!n.read ? <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} /> : null}
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {n.title}
              </Text>
              <Text variant="xs" color="muted" numberOfLines={2}>
                {n.body}
              </Text>
            </View>
            <Text variant="xxs" color="muted">
              {relativeTime(n.created_at)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0 },
  page: { flex: 1, minHeight: 0 },
  sidebar: { width: 264, borderRightWidth: 1, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 20 },
  sidebarInner: { gap: 20 },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  brandmark: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  word: { fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: -0.63 },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  nav: { gap: 18 },
  navGroup: { gap: 2 },
  navLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.47,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingBottom: 6,
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
  topbar: { height: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 32, borderBottomWidth: 1, zIndex: 20 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.medium, fontSize: 14 },
  pop: { position: 'absolute', top: 48, borderWidth: 1, borderRadius: 14, paddingVertical: 6, zIndex: 30 },
  bellPop: { right: 0, width: 360 },
  popHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6 },
  hit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 10,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
