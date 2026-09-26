import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Preferences } from '@/api/types';
import { useUnread } from '@/features/common/useUnread';
import { useFamily } from '@/features/family/useFamily';
import { stopRealtime } from '@/features/realtime/realtime';
import { LANGUAGES, setLanguage } from '@/i18n';
import { APP_VERSION } from '@/lib/config';
import { daysUntil, formatDate, formatInr } from '@/lib/format';
import { maskPhone } from '@/state/lastAccount';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { pastel as pastelColors, type Pastel } from '@/theme/tokens';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  ICON_SIZE,
  IconButton,
  ListRow,
  pointer,
  Screen,
  SectionHead,
  Sheet,
  Switch,
  Text,
  ThemeToggle,
  TileIcon,
} from '@/ui';

/** ParentProfile ("More"): account, children, every other screen, alert channels and preferences. */
export default function ParentMore() {
  const { t, i18n } = useTranslation();
  const { colors, scheme, toggleScheme } = useTheme();
  const client = useQueryClient();
  const user = useSession((s) => s.user);
  const role = useSession((s) => s.role);
  const memberships = useSession((s) => s.memberships);
  const school = useActiveSchool();
  const unread = useUnread();
  const family = useFamily();
  const studentId = family.selected?.id;
  const [confirmOut, setConfirmOut] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const homework = useQuery({ queryKey: ['homework', studentId], queryFn: () => api.homework(studentId as string), enabled: !!studentId });
  const summary = useQuery({ queryKey: ['summary', studentId], queryFn: () => api.summary(studentId as string), enabled: !!studentId });
  const remarks = useQuery({ queryKey: ['remarks', studentId], queryFn: () => api.remarks(studentId as string), enabled: !!studentId });
  const docs = useQuery({ queryKey: ['documents', studentId], queryFn: () => api.documents(studentId as string), enabled: !!studentId });

  const due = (homework.data?.items ?? []).filter((h) => !h.submission && daysUntil(h.due_date) >= 0 && daysUntil(h.due_date) <= 6).length;
  const now = summary.data?.today.ribbon.current;
  const month = new Date().toISOString().slice(0, 7);
  const remarksMonth = (remarks.data?.items ?? []).filter((r) => r.created_at.slice(0, 7) === month).length;
  const invoice = summary.data?.next_invoice;
  const prefs = user?.preferences;

  const save = useMutation({
    mutationFn: (channels: Partial<Preferences['channels']>) => api.updateMe({ preferences: { channels } }),
    onSuccess: ({ user: next }) => void useSession.getState().setProfile(next, memberships),
  });
  const changeLanguage = (code: string) => {
    setLanguage(code);
    setLangOpen(false);
    void api
      .updateMe({ language: code })
      .then(({ user: next }) => useSession.getState().setProfile(next, memberships))
      .catch(() => undefined);
  };
  const signOut = async () => {
    setConfirmOut(false);
    stopRealtime();
    client.clear();
    await useSession.getState().signOut();
    router.replace('/');
  };
  const help = useMutation({
    mutationFn: () =>
      api.startConversation({
        kind: 'department',
        department: 'office',
        name: '',
        initials: '',
        subtitle: '',
        student: { id: studentId as string, name: family.selected?.name ?? '', first_name: family.selected?.first_name ?? '' },
      }),
    onSuccess: (c) => router.push(`/chat/${c.id}`),
    onError: () => router.push('/parent/messages'),
  });

  const channels = prefs?.channels ?? { push: true, sms: true, whatsapp: false, email: true };
  const channel = (key: keyof Preferences['channels'], label: string, hint: string) => (
    <View style={[styles.row, { gap: 12, paddingVertical: 8 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={600}>
          {label}
        </Text>
        <Text variant="xxs" color="muted">
          {hint}
        </Text>
      </View>
      <Switch value={channels[key] && (key !== 'email' || !!user?.email)} onChange={(v) => save.mutate({ [key]: v })} label={label} disabled={key === 'email' && !user?.email} />
    </View>
  );

  return (
    <Screen
      dock
      gap={18}
      header={
        <AppBar
          title={t('parent.more.title')}
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="bell" size="lg" ping={unread.notifications > 0} label={t('parent.home.notifications', { count: unread.notifications })} onPress={() => router.push('/parent/notifications')} />
            </>
          }
        />
      }>
      <Card pad={18} style={[styles.row, { gap: 14 }]}>
        <Avatar initials={user?.initials ?? ''} size="lg" tone={1} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="h3" style={{ fontSize: 17 }}>
            {user?.full_name}
          </Text>
          <Text variant="sm" color="ink2" num>
            {maskPhone(user?.phone ?? '')}
          </Text>
          <Text variant="xs" color="muted" numberOfLines={1}>
            {t('parent.more.account', { role: role ? t(`roles.${role}`) : '', school: school?.name ?? '' })}
          </Text>
        </View>
        <IconButton icon="pencil" label={t('parent.more.editProfile')} size="lg" onPress={() => router.push('/settings')} />
      </Card>

      {family.students.length ? (
        <View style={{ gap: 10 }}>
          <SectionHead
            title={t('parent.more.linked')}
            action={
              <Text variant="xs" color="muted" weight={600}>
                {t('parent.more.childrenCount', { count: family.students.length })}
              </Text>
            }
          />
          <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
            {family.students.map((s, i) => {
              const p = pastelColors(colors, (['blue', 'pink', 'mint', 'lav', 'peach', 'butter'] as Pastel[])[i % 6]);
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => router.push('/parent/children')}
                  style={[styles.qa, { backgroundColor: p.bg }, pointer]}>
                  <Avatar initials={s.initials} size="md" tone={i ? 4 : 1} style={{ backgroundColor: colors.surface }} />
                  <View>
                    <Text variant="sm" weight={700}>
                      {s.name}
                    </Text>
                    <Text variant="xs" color="ink2">
                      {t('parent.more.classRoll', { class: s.class.short_label, roll: String(s.roll_no).padStart(2, '0') })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Group title={t('parent.more.academics')}>
        <MenuRow icon="edit" tone="peach" title={t('parent.more.homework')} value={due ? t('parent.more.homeworkDue', { count: due }) : undefined} to="/parent/homework" />
        <MenuRow icon="calendar" tone="brand" title={t('parent.more.timetable')} value={now ? t('parent.more.timetableNow', { subject: now.subject.split(' ')[0] }) : undefined} to="/parent/timetable" />
        <MenuRow icon="chat" tone="brand" title={t('parent.more.remarks')} value={remarksMonth ? t('parent.more.remarksMonth', { count: remarksMonth }) : undefined} to="/parent/remarks" />
        <MenuRow icon="folder" tone="brand" title={t('parent.more.documents')} value={docs.data ? t('parent.documents.files', { count: docs.data.total }) : undefined} to="/parent/documents" last />
      </Group>

      <Group title={t('parent.more.payments')}>
        <ListRow
          inset={0}
          last
          icon="wallet"
          iconTone="peach"
          title={t('parent.more.fees')}
          onPress={() => router.push('/parent/fees')}
          chevron={!invoice}
          subtitle={
            <Text variant="xs" weight={700} rawColor={invoice ? colors.warn : colors.ok}>
              {invoice ? t('parent.more.feesDue', { amount: formatInr(invoice.amount), date: formatDate(invoice.due_date) }) : t('parent.more.feesClear')}
            </Text>
          }
          right={invoice ? <Button title={t('parent.more.payNow')} decorative /> : undefined}
        />
      </Group>

      <Group title={t('parent.more.communication')}>
        <MenuRow icon="chat" tone="pink" title={t('parent.more.messages')} badge={unread.messages} to="/parent/messages" />
        <MenuRow icon="bell" tone="brand" title={t('parent.more.notifications')} badge={unread.notifications} to="/parent/notifications" last />
      </Group>

      <Group title={t('parent.more.preferences')}>
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={[styles.row, { gap: 12 }]}>
            <TileIcon icon="sliders" tone="brand" />
            <View style={{ flex: 1 }}>
              <Text variant="sm" weight={700} style={{ fontSize: 14 }}>
                {t('parent.more.channels')}
              </Text>
              <Text variant="xs" color="muted">
                {t('parent.more.channelsHint')}
              </Text>
            </View>
          </View>
          <View style={{ paddingLeft: 52, paddingTop: 6 }}>
            {channel('push', t('parent.more.push'), t('parent.more.pushHint'))}
            {channel('sms', t('parent.more.sms'), maskPhone(user?.phone ?? ''))}
            {channel('whatsapp', t('parent.more.whatsapp'), t('parent.more.whatsappHint'))}
            {channel('email', t('parent.more.email'), user?.email ?? t('parent.more.noEmail'))}
          </View>
        </View>
        <ListRow inset={0} icon="moon" iconTone="brand" title={t('parent.more.darkMode')} right={<Switch value={scheme === 'dark'} onChange={toggleScheme} label={t('parent.more.darkMode')} />} />
        <MenuRow
          icon="globe"
          tone="brand"
          title={t('parent.more.language')}
          value={LANGUAGES.find((l) => l.code === i18n.language)?.label}
          onPress={() => setLangOpen(true)}
        />
        <MenuRow icon="info" tone="brand" title={t('parent.more.help')} value={t('parent.more.helpValue')} onPress={() => (studentId ? help.mutate() : router.push('/parent/messages'))} last />
      </Group>

      <Button title={t('parent.more.signOut')} icon="logout" variant="ghost" size="lg" textColor={colors.bad} onPress={() => setConfirmOut(true)} style={{ alignSelf: 'center' }} />
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text variant="xs" color="muted">
          {t('parent.more.version', { version: APP_VERSION })}
        </Text>
        <Text variant="xs" color="muted">
          {[school?.name, school?.campus].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <Sheet visible={confirmOut} onClose={() => setConfirmOut(false)} title={t('parent.more.signOutTitle')} message={t('parent.more.signOutBody')}>
        <Button title={t('parent.more.signOut')} variant="danger" size="lg" fullWidth onPress={() => void signOut()} />
        <Button title={t('parent.more.cancel')} variant="ghost" fullWidth onPress={() => setConfirmOut(false)} />
      </Sheet>
      <Sheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('parent.more.languageTitle')}>
        {LANGUAGES.map((l, i) => (
          <ListRow
            key={l.code}
            inset={0}
            last={i === LANGUAGES.length - 1}
            title={l.label}
            onPress={() => changeLanguage(l.code)}
            chevron={false}
            right={i18n.language === l.code ? <Icon name="check" size={ICON_SIZE.md} rawColor={colors.brandInk} bold /> : undefined}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="eyebrow" style={{ paddingHorizontal: 4 }} accessibilityRole="header">
        {title}
      </Text>
      <Card pad={0} style={{ paddingVertical: 2, paddingHorizontal: 16 }}>
        {children}
      </Card>
    </View>
  );
}

function MenuRow({
  icon,
  tone,
  title,
  value,
  badge,
  to,
  onPress,
  last,
}: {
  icon: 'edit' | 'calendar' | 'chat' | 'folder' | 'bell' | 'globe' | 'info';
  tone: 'peach' | 'brand' | 'pink';
  title: string;
  value?: string;
  badge?: number;
  to?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <ListRow
      inset={0}
      last={last}
      icon={icon}
      iconTone={tone}
      title={title}
      onPress={onPress ?? (() => to && router.push(to as never))}
      right={
        badge ? (
          <Badge value={badge > 9 ? '9+' : badge} />
        ) : value ? (
          <Text variant="xs" color="muted" weight={600}>
            {value}
          </Text>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  qa: { flex: 1, gap: 10, padding: 14, borderRadius: 18 },
});
