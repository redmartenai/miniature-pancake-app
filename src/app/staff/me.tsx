import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Preferences } from '@/api/types';
import { stopRealtime } from '@/features/realtime/realtime';
import { monthName } from '@/lib/format';
import { maskPhone } from '@/state/lastAccount';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Avatar, Button, Card, Icon, ICON_SIZE, ListRow, LoadingCards, pointer, Screen, Sheet, Switch, Text, TileIcon } from '@/ui';

/** StaffProfile ("Me"): who you are at school, your classes, leave, and the rest of your tools. */
export default function StaffMe() {
  const { t } = useTranslation();
  const { colors, scheme, toggleScheme } = useTheme();
  const client = useQueryClient();
  const user = useSession((s) => s.user);
  const memberships = useSession((s) => s.memberships);
  const school = useActiveSchool();
  const me = useQuery({ queryKey: ['staff-me'], queryFn: api.staffMe });
  const [confirmOut, setConfirmOut] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const data = me.data;
  const led = data?.classes.find((c) => c.is_class_teacher);
  const joined = data?.profile.joined_on;

  const channels = user?.preferences?.channels ?? { push: true, sms: true, whatsapp: false, email: true };
  const save = useMutation({
    mutationFn: (next: Partial<Preferences['channels']>) => api.updateMe({ preferences: { channels: next } }),
    onSuccess: ({ user: next }) => void useSession.getState().setProfile(next, memberships),
  });
  const signOut = async () => {
    setConfirmOut(false);
    stopRealtime();
    client.clear();
    await useSession.getState().signOut();
    router.replace('/');
  };
  const leave = data?.leave ?? [];
  const short = { casual: 'CL', sick: 'SL', earned: 'EL' } as const;
  const on = (Object.keys(channels) as (keyof Preferences['channels'])[]).filter((k) => channels[k]);

  return (
    <Screen dock gap={18} header={<AppBar subtitle={[school?.name, school?.campus].filter(Boolean).join(' · ')} title={t('staff.me.title')} />}>
      {!data ? <LoadingCards count={3} /> : null}
      {data ? (
        <>
          <Card pad={20} style={{ gap: 16 }}>
            <View style={[styles.row, { gap: 16, alignItems: 'flex-start' }]}>
              <Avatar initials={user?.initials ?? ''} size="xl" tone={2} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text variant="h2">{user?.full_name}</Text>
                <Text variant="sm" weight={600} color="ink2">
                  {[data.profile.designation, led ? t('staff.me.classTeacherOf', { class: led.short_label }) : null].filter(Boolean).join(' · ')}
                </Text>
                {data.profile.employee_id ? (
                  <Text variant="xs" color="muted">
                    {t('staff.me.employeeId', { id: data.profile.employee_id })}
                  </Text>
                ) : null}
                {joined ? (
                  <Text variant="xs" color="muted">
                    {t('staff.me.joined', { month: monthName(joined), year: joined.slice(0, 4) })}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Text variant="xs" weight={700}>
                {t('staff.me.assigned', { year: school?.academic_year ?? '' })}
              </Text>
              <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
                {data.classes.map((c) => (
                  <View key={c.id} style={[styles.classChip, { borderColor: c.is_class_teacher ? 'transparent' : colors.lineStrong, backgroundColor: c.is_class_teacher ? colors.brandSoft : colors.surface }]}>
                    <Text variant="xs" weight={700} rawColor={c.is_class_teacher ? colors.brandInk : colors.ink2}>
                      {c.is_class_teacher ? t('staff.me.classTeacherChip', { class: c.short_label }) : c.short_label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text variant="xs" color="muted">
                {t('staff.me.setByPrincipal')}
              </Text>
            </View>
          </Card>

          <Card pad={18} style={[styles.row, { gap: 12 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="xs" color="ink2">
                {t('staff.me.leaveBalance')}
              </Text>
              <Text variant="sm" weight={700} num>
                {leave.map((b) => `${short[b.kind]} ${b.left}`).join(' · ')}
              </Text>
            </View>
            <Button title={t('staff.home.applyLeave')} height={44} onPress={() => router.push('/staff/leave')} />
          </Card>

          <Card pad={0} style={{ paddingVertical: 2, paddingHorizontal: 16 }}>
            <ListRow
              inset={0}
              icon="calendarX"
              iconTone="mint"
              title={t('staff.me.leave')}
              subtitle={data.pending_leave ? t('staff.me.pending', { count: data.pending_leave }) : t('staff.me.noPending')}
              onPress={() => router.push('/staff/leave')}
            />
            <ListRow inset={0} icon="folder" iconTone="brand" title={t('staff.me.documents')} subtitle={t('staff.me.documentsHint')} onPress={() => router.push('/staff/documents')} />
            <ListRow
              inset={0}
              icon="calendar"
              iconTone="brand"
              title={t('staff.me.timetable')}
              subtitle={t('staff.me.periodsWeek', { count: data.periods_per_week })}
              onPress={() => router.push('/staff/timetable')}
            />
            <ListRow
              inset={0}
              icon="bell"
              iconTone="brand"
              title={t('staff.me.notifications')}
              subtitle={on.length ? on.map((k) => t(`parent.more.${k}`)).join(' · ') : t('staff.me.allOff')}
              onPress={() => setPrefsOpen(true)}
            />
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: scheme === 'dark' }}
              onPress={toggleScheme}
              style={[styles.row, { gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, pointer]}>
              <TileIcon icon="moon" tone="brand" />
              <View style={{ flex: 1 }}>
                <Text variant="sm" weight={700} style={{ fontSize: 14 }}>
                  {t('staff.me.darkMode')}
                </Text>
                <Text variant="xs" color="muted">
                  {scheme === 'dark' ? t('staff.me.on') : t('staff.me.off')}
                </Text>
              </View>
              <Switch value={scheme === 'dark'} onChange={toggleScheme} label={t('staff.me.darkMode')} decorative />
            </Pressable>
            <ListRow inset={0} last icon="info" iconTone="brand" title={t('staff.me.help')} subtitle={t('staff.me.helpHint')} onPress={() => router.push('/chat/new')} />
          </Card>

          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmOut(true)}
            style={[styles.row, styles.signOut, { backgroundColor: colors.badSoft }, pointer]}>
            <Icon name="logout" size={ICON_SIZE.sm} rawColor={colors.bad} />
            <Text variant="body" weight={700} color="bad">
              {t('staff.me.signOut')}
            </Text>
          </Pressable>
        </>
      ) : null}

      <Sheet visible={prefsOpen} onClose={() => setPrefsOpen(false)} title={t('staff.me.notifications')} message={t('staff.me.notificationsBody')}>
        {(['push', 'sms', 'whatsapp', 'email'] as const).map((k) => (
          <View key={k} style={[styles.row, { gap: 12, paddingVertical: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text variant="sm" weight={600}>
                {t(`parent.more.${k}`)}
              </Text>
              <Text variant="xxs" color="muted">
                {k === 'sms' ? maskPhone(user?.phone ?? '') : k === 'email' ? (user?.email ?? t('parent.more.noEmail')) : t(`parent.more.${k}Hint`)}
              </Text>
            </View>
            <Switch value={channels[k] && (k !== 'email' || !!user?.email)} disabled={k === 'email' && !user?.email} onChange={(v) => save.mutate({ [k]: v })} label={t(`parent.more.${k}`)} />
          </View>
        ))}
      </Sheet>
      <Sheet visible={confirmOut} onClose={() => setConfirmOut(false)} title={t('parent.more.signOutTitle')} message={t('parent.more.signOutBody')}>
        <Button title={t('staff.me.signOut')} variant="danger" size="lg" fullWidth onPress={() => void signOut()} />
        <Button title={t('parent.more.cancel')} variant="ghost" fullWidth onPress={() => setConfirmOut(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  classChip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, justifyContent: 'center' },
  signOut: { height: 56, borderRadius: 18, justifyContent: 'center', gap: 10 },
});
