import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Path, Rect } from 'react-native-svg';

import { api } from '@/api/endpoints';
import type { IdCard, StudentCard } from '@/api/types';
import { useUnread } from '@/features/common/useUnread';
import { useFamily } from '@/features/family/useFamily';
import { stopRealtime } from '@/features/realtime/realtime';
import { mix } from '@/lib/color';
import { daysUntil, formatDate, isoDate, monthName } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppBar, Badge, Button, Icon, ICON_SIZE, Kicker, cardShadowLg, Pill, pointer, Screen, Sheet, Switch, Text } from '@/ui';

/** StuProfile ("Me"): the student ID card, shortcuts to the rest of school, dark mode and sign out. */
export default function StudentMe() {
  const { t } = useTranslation();
  const { colors, scheme, toggleScheme } = useTheme();
  const client = useQueryClient();
  const schoolId = useSession((s) => s.schoolId);
  const unread = useUnread();
  const family = useFamily();
  const me = family.selected;
  const id = me?.id;
  const month = isoDate(new Date()).slice(0, 7);
  // useFamily already loads /student/me under this key; the ID card rides along.
  const self = useQuery({ queryKey: ['student-me', schoolId], queryFn: api.studentMe, enabled: false });
  const card = self.data?.id_card;
  const classes = useQuery({ queryKey: ['student-classes', id], queryFn: () => api.studentClasses(id as string), enabled: !!id });
  const register = useQuery({ queryKey: ['attendance', id, month], queryFn: () => api.attendance(id as string, month), enabled: !!id });
  const exams = useQuery({ queryKey: ['exams', id], queryFn: () => api.exams(id as string), enabled: !!id });
  const assignments = useQuery({ queryKey: ['assignments', id], queryFn: () => api.assignments(id as string), enabled: !!id });
  const materials = useQuery({ queryKey: ['materials', id, ''], queryFn: () => api.materials(id as string), enabled: !!id });
  const [gate, setGate] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  const signOut = async () => {
    setConfirmOut(false);
    stopRealtime();
    client.clear();
    await useSession.getState().signOut();
    router.replace('/');
  };

  const firstPaper = exams.data?.papers?.[0];
  const examIn = firstPaper ? daysUntil(firstPaper.date) : null;
  const inProgress = assignments.data?.in_progress.length ?? 0;
  const newMaterial = materials.data?.new_total ?? 0;
  const summary = register.data?.summary;

  return (
    <Screen dock gap={18} header={<AppBar subtitle={t('student.me.kicker')} title={t('student.me.title')} />}>
      {me ? <IdCardView student={me} card={card} /> : null}
      <Button title={t('student.me.showId')} icon="scan" size="lg" fullWidth onPress={() => setGate(true)} disabled={!card} />

      <View style={{ gap: 4, paddingTop: 6 }}>
        <Kicker>{t('student.me.mySchool')}</Kicker>
        <View>
          <MenuRow title={t('student.me.classes')} value={classes.data ? t('student.me.subjects', { count: classes.data.subjects.length }) : undefined} to="/student/classes" />
          <MenuRow
            title={t('student.me.attendance')}
            value={summary ? t('student.me.daysIn', { present: summary.present, days: summary.school_days, month: monthName(`${month}-01`, true) }) : undefined}
            to="/student/attendance"
          />
          <MenuRow
            title={t('student.me.exams')}
            value={exams.data?.exam && examIn !== null && examIn >= 0 ? t('student.me.examIn', { name: exams.data.exam.name, count: examIn }) : undefined}
            to="/student/exams"
          />
          <MenuRow title={t('student.me.assignments')} value={inProgress ? t('student.me.inProgress', { count: inProgress }) : undefined} to="/student/assignments" />
          <MenuRow title={t('student.me.material')} right={newMaterial ? <Pill label={t('student.me.new', { count: newMaterial })} tone="brand" dot={false} /> : undefined} to="/student/material" />
          <MenuRow
            title={t('student.me.messages')}
            right={unread.messages ? <Badge value={unread.messages > 9 ? '9+' : unread.messages} /> : undefined}
            accessibilityLabel={unread.messages ? t('student.me.unread', { count: unread.messages }) : undefined}
            to="/student/messages"
          />
        </View>
      </View>

      <View style={{ gap: 4, paddingTop: 6 }}>
        <Kicker>{t('student.me.settings')}</Kicker>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: scheme === 'dark' }}
          onPress={toggleScheme}
          style={[styles.row, styles.item, { minHeight: 60, borderBottomColor: colors.line }, pointer]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700}>
              {t('student.me.darkMode')}
            </Text>
            <Text variant="xs" color="muted">
              {t('student.me.darkHint')}
            </Text>
          </View>
          <Switch value={scheme === 'dark'} onChange={toggleScheme} label={t('student.me.darkMode')} decorative />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setConfirmOut(true)} style={[styles.row, styles.item, { borderBottomColor: colors.line }, pointer]}>
          <Text variant="sm" weight={700} color="bad" style={{ flex: 1 }}>
            {t('student.me.signOut')}
          </Text>
          <Icon name="logout" size={ICON_SIZE.sm} rawColor={colors.bad} />
        </Pressable>
      </View>

      {card?.guardian ? (
        <Text variant="xs" color="muted" align="center" style={{ paddingHorizontal: 12 }}>
          {t('student.me.parentSees', { name: card.guardian })}
        </Text>
      ) : null}

      <Sheet visible={gate} onClose={() => setGate(false)} title={t('student.me.gateTitle')} message={t('student.me.gateBody')}>
        {card && me ? (
          <View style={{ alignItems: 'center', gap: 14, paddingVertical: 8 }}>
            <View style={{ padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF' }}>
              <QRCode value={card.qr} size={220} color="#000000" backgroundColor="#FFFFFF" />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text variant="h3">{me.name}</Text>
              <Text variant="sm" color="ink2" num>
                {t('student.me.classRoll', { class: me.class.short_label, roll: me.roll_no })} · {me.admission_no}
              </Text>
            </View>
          </View>
        ) : null}
        <Button title={t('common.done')} variant="secondary" size="lg" fullWidth onPress={() => setGate(false)} />
      </Sheet>
      <Sheet visible={confirmOut} onClose={() => setConfirmOut(false)} title={t('parent.more.signOutTitle')} message={t('student.me.signOutBody')}>
        <Button title={t('student.me.signOut')} variant="danger" size="lg" fullWidth onPress={() => void signOut()} />
        <Button title={t('parent.more.cancel')} variant="ghost" fullWidth onPress={() => setConfirmOut(false)} />
      </Sheet>
    </Screen>
  );
}

/** House colours for the card's swatch and stripe. Unknown houses fall back to the school brand. */
function houseColor(house: string | null | undefined, colors: ReturnType<typeof useTheme>['colors']): string {
  switch ((house ?? '').toLowerCase()) {
    case 'teal':
      return mix(colors.pBlueInk, colors.pMintInk, 0.65);
    case 'crimson':
      return colors.pPinkInk;
    case 'amber':
      return colors.pPeachInk;
    case 'indigo':
      return colors.pLavInk;
    default:
      return colors.brand;
  }
}

function IdCardView({ student, card }: { student: StudentCard; card?: IdCard }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const school = useActiveSchool();
  const house = houseColor(card?.house, colors);
  const year = card?.academic_year ?? school?.academic_year ?? '';
  const dt = (label: string) => (
    <Text variant="xxs" color="muted" weight={700} style={styles.dt}>
      {label}
    </Text>
  );
  return (
    <View accessibilityLabel={t('student.me.cardLabel')} style={{ alignItems: 'center' }}>
      <Svg width={300} height={54} viewBox="0 0 300 54" style={{ zIndex: 1, marginBottom: -14 }}>
        <Path d="M100 0h20l36 34h-14Z" fill={colors.brand} opacity={0.75} />
        <Path d="M200 0h-20l-36 34h14Z" fill={colors.brand} />
        <Rect x={136} y={28} width={28} height={15} rx={4} fill={colors.lineStrong} />
        <Rect x={146} y={40} width={8} height={14} rx={3} fill={colors.lineStrong} stroke={colors.surface} strokeWidth={1.5} />
      </Svg>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.lineStrong }, cardShadowLg(scheme)]}>
        <View style={{ height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 46, height: 10, borderRadius: 6, backgroundColor: colors.sunken, boxShadow: `inset 0 0 0 1.5px ${colors.lineStrong}` }} />
        </View>
        <View style={[styles.row, { backgroundColor: colors.brand, paddingVertical: 11, paddingHorizontal: 16, gap: 10 }]}>
          <View style={[styles.logo, { borderColor: colors.onBrand }]}>
            <Text rawColor={colors.onBrand} weight={800} style={{ fontSize: 11 }}>
              {school?.initials}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text variant="sm" weight={800} rawColor={colors.onBrand} numberOfLines={1} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {school?.name}
            </Text>
            <Text variant="xxs" weight={600} rawColor={colors.onBrand} numberOfLines={1}>
              {[school?.campus, t('student.me.studentId', { year })].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <View style={[styles.row, { padding: 16, paddingBottom: 14, gap: 14, alignItems: 'flex-start' }]}>
          <View style={[styles.photo, { backgroundColor: colors.brandSoft, boxShadow: `inset 0 0 0 1px ${colors.brandLine}` }]}>
            <Text rawColor={colors.brandInk} style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6 }}>
              {student.initials}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            <View>
              <Text style={{ fontFamily: fonts.display, fontSize: 21, lineHeight: 24 }}>{student.name}</Text>
              <Text variant="sm" color="ink2" weight={600} style={{ marginTop: 2 }}>
                {t('student.me.classRoll', { class: student.class.short_label, roll: student.roll_no })}
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              <View>
                {dt(t('student.me.admNo'))}
                <Text variant="sm" weight={700} num>
                  {student.admission_no}
                </Text>
              </View>
              {card?.date_of_birth ? (
                <View>
                  {dt(t('student.me.dob'))}
                  <Text variant="sm" weight={700} num>
                    {formatDate(card.date_of_birth, { year: true })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={[styles.row, { marginHorizontal: 16, paddingVertical: 12, gap: 12, alignItems: 'flex-start', borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong }]}>
          <View style={{ width: 96 }}>
            {dt(t('student.me.house'))}
            <View style={[styles.row, { gap: 6 }]}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: house }} />
              <Text variant="sm" weight={700}>
                {card?.house ?? '—'}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {dt(t('student.me.bus'))}
            <Text variant="sm" weight={700}>
              {card?.bus?.route ?? t('student.me.noBus')}
            </Text>
            {card?.bus ? (
              <Text variant="xxs" color="muted" weight={600}>
                {card.bus.stop}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.row, { paddingHorizontal: 16, paddingBottom: 14, gap: 14, alignItems: 'flex-end' }]}>
          <View style={[styles.qr, { borderColor: colors.lineStrong, backgroundColor: '#FFFFFF' }]}>
            {card ? <QRCode value={card.qr} size={64} color="#000000" backgroundColor="#FFFFFF" /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Svg width={96} height={22} viewBox="0 0 96 22">
              <Path
                d="M3 16c5-9 9-12 11-7s-1 9 3 5 6-10 9-6-1 8 4 5 5-7 8-5 2 6 6 3 9-5 13-4 7 2 12 0"
                fill="none"
                stroke={colors.ink2}
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text variant="xxs" color="muted" weight={600} style={{ borderTopWidth: 1, borderTopColor: colors.lineStrong, paddingTop: 3 }} numberOfLines={1}>
              {card?.principal ? t('student.me.principal', { name: card.principal }) : ''}
            </Text>
            {card?.valid_till ? (
              <Text variant="xs" weight={700} style={{ marginTop: 3 }}>
                {t('student.me.validTill', { date: formatDate(card.valid_till, { year: true }) })}
              </Text>
            ) : null}
            {school?.address ? (
              <Text variant="xxs" color="muted">
                {t('student.me.ifFound', { address: school.address })}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.row, styles.stripe, { backgroundColor: house }]}>
          <Text rawColor={colors.surface} weight={800} style={styles.stripeText}>
            {card?.house ? t('student.me.houseStripe', { house: card.house }) : school?.short_name}
          </Text>
          <Text rawColor={colors.surface} weight={800} style={styles.stripeText}>
            {year}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MenuRow({ title, value, right, to, accessibilityLabel }: { title: string; value?: string; right?: ReactNode; to: string; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ? `${title}, ${accessibilityLabel}` : undefined}
      onPress={() => router.push(to as never)}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.row, styles.item, { borderBottomColor: colors.line, gap: 10 }, hovered && { backgroundColor: colors.subtle }, pointer]}>
      <Text variant="sm" weight={700} style={{ flex: 1 }}>
        {title}
      </Text>
      {right ??
        (value ? (
          <Text variant="xs" color="muted" weight={600}>
            {value}
          </Text>
        ) : null)}
      <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { minHeight: 52, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1 },
  card: { width: 300, borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  logo: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photo: { width: 84, height: 104, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dt: { textTransform: 'uppercase', letterSpacing: 0.9 },
  qr: { width: 76, height: 76, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stripe: { height: 26, paddingHorizontal: 16, justifyContent: 'space-between' },
  stripeText: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
});
