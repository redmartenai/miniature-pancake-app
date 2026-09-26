import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, Text as RNText, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { StaffClassCard } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { RollDots, shortExam } from '@/features/staff/common';
import { weekdayName } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, pastel } from '@/theme/tokens';
import { AppBar, Bar, Button, cardShadow, Delta, EmptyState, ErrorState, Highlight, Icon, ICON_SIZE, IconButton, LoadingCards, pointer, Screen, Stamp, Text, ThemeToggle } from '@/ui';

/** StaffClasses: each section as a register book: size, room, today's roll call, unit-test average, syllabus. */
export default function StaffClasses() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useActiveSchool();
  const query = useQuery({ queryKey: ['staff-classes'], queryFn: api.staffClasses });
  useRefetchOnFocus(query.refetch);
  const data = query.data;
  // The class-teacher register first, then the rest in class order.
  const classes = [...(data?.classes ?? [])].sort((a, b) => Number(b.is_class_teacher) - Number(a.is_class_teacher));
  const students = classes.reduce((n, c) => n + c.student_count, 0);
  const away = classes.reduce((n, c) => n + c.today.absent.length, 0);
  const open = classes.find((c) => c.open_sheet);
  const slipped = classes.filter((c) => delta(c) !== null && (delta(c) ?? 0) < 0);

  return (
    <Screen
      dock
      gap={18}
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar
          subtitle={[data?.subject?.name, school?.academic_year].filter(Boolean).join(' · ')}
          title={t('staff.classes.title')}
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="calendar" size="lg" label={t('staff.classes.timetable')} onPress={() => router.push('/staff/timetable')} />
            </>
          }
        />
      }>
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data && !classes.length ? <EmptyState icon="layers" title={t('staff.classes.none')} /> : null}
      {classes.length ? (
        <View style={{ gap: 8, paddingTop: 2, paddingHorizontal: 2 }}>
          <Text variant="lg" color="ink2" style={{ lineHeight: 24 }}>
            <Text variant="lg" weight={700} color="ink">
              {t('staff.classes.summary', { sections: t('staff.classes.sections', { count: classes.length }), students })}
            </Text>{' '}
            <Trans
              i18nKey={away ? (open ? 'staff.classes.awayOpen' : 'staff.classes.away') : open ? 'staff.classes.allInOpen' : 'staff.classes.allIn'}
              values={{ count: away, class: open?.short_label ?? '', exam: open?.open_sheet?.exam.name ?? '' }}
              components={{ m: <Highlight color="mint" />, l: <Highlight color="lav" /> }}
            />
          </Text>
          <View style={[styles.row, { gap: 8 }]}>
            <Icon name="shield" size={ICON_SIZE.sm} rawColor={colors.muted} />
            <Text variant="xs" color="muted" weight={600}>
              {t('staff.classes.onlyYours')}
            </Text>
          </View>
        </View>
      ) : null}
      {classes.map((c) => (
        <ClassBook key={c.id} c={c} year={school?.academic_year ?? ''} onlySlipped={slipped.length === 1} />
      ))}
    </Screen>
  );
}

function delta(c: StaffClassCard): number | null {
  const [prev, last] = c.exams.slice(-2);
  return prev && last ? Math.round(last.average - prev.average) : null;
}

/** One section as a register: a coloured spine, the class plate, today's roll call and the numbers. */
function ClassBook({ c, year, onlySlipped }: { c: StaffClassCard; year: string; onlySlipped: boolean }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const p = pastel(colors, c.is_class_teacher ? 'mint' : 'lav');
  const d = delta(c);
  const last = c.exams[c.exams.length - 1];
  const sheet = c.open_sheet;
  const today = c.today;
  const subject = c.subject?.name ?? '';
  const away = [...today.absent, ...today.late];
  const todayText = !today.marked
    ? t('staff.classes.notMarked')
    : c.is_class_teacher && away.length <= 3
      ? [
          t('staff.classes.present', { count: today.present - today.late.length }),
          ...today.absent.map((a) => t('staff.home.absentName', { name: a.first_name })),
          ...today.late.map((a) => t('staff.home.lateName', { name: a.first_name })),
        ].join(' · ')
      : [
          t('staff.classes.present', { count: today.on_time }),
          today.absent.length ? t('staff.classes.absent', { count: today.absent.length }) : null,
          today.late.length ? t('staff.classes.late', { count: today.late.length }) : null,
        ]
          .filter(Boolean)
          .join(' · ');
  const first = today.rolls[0];
  const shortcut = (label: string, onPress: () => void, last?: boolean) => (
    <>
      <Pressable accessibilityRole="link" onPress={onPress} style={[styles.shortcut, pointer]}>
        <Text variant="xs" weight={700} color="ink2">
          {label}
        </Text>
      </Pressable>
      {!last ? <View style={{ width: 1, marginVertical: 12, backgroundColor: colors.line }} /> : null}
    </>
  );
  return (
    <View
      accessibilityLabel={t('staff.classes.bookLabel', { class: c.short_label, count: c.student_count })}
      style={[styles.book, { backgroundColor: colors.surface, borderColor: colors.lineStrong }, cardShadow(scheme)]}>
      <View style={[styles.spine, { backgroundColor: p.bg }]}>
        <View style={{ position: 'absolute', top: 8, bottom: 8, right: 5, borderRightWidth: 1.5, borderStyle: 'dashed', borderRightColor: p.ink, opacity: 0.45 }} />
        <RNText style={[styles.spineText, { color: p.ink }]}>
          {c.is_class_teacher ? t('staff.classes.register', { year }) : `${subject} · ${c.short_label}`}
        </RNText>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ padding: 16, paddingBottom: 14, gap: 14 }}>
          <View style={[styles.row, { gap: 14, alignItems: 'flex-start' }]}>
            <View style={[styles.plateOuter, { borderColor: colors.lineStrong }]}>
              <View style={[styles.plateInner, { borderColor: colors.line }]}>
                <Text variant="xxs" color="muted" weight={700} align="center" style={{ letterSpacing: 1.6, textTransform: 'uppercase' }}>
                  {t('staff.classes.class')}
                </Text>
                <Text accessibilityRole="header" align="center" style={styles.plate}>
                  {c.short_label}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3, paddingTop: 4 }}>
              <Text variant="sm" weight={700}>
                {t('staff.classes.students', { count: c.student_count })}
              </Text>
              <Text variant="xs" color="muted">
                {[c.room, c.periods_per_week >= 6 ? t('staff.classes.daily', { subject: subject === 'Mathematics' ? 'Maths' : subject }) : t('staff.classes.perWeek', { count: c.periods_per_week })]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {c.is_class_teacher ? (
                <Stamp tone="brand" rotate={-5} style={{ marginTop: 8 }}>
                  {t('staff.classes.classTeacher')}
                </Stamp>
              ) : d !== null && d < 0 ? (
                <View style={[styles.row, { gap: 4 }]}>
                  <Icon name="trendDown" size={ICON_SIZE.sm} rawColor={colors.bad} />
                  <Text variant="xs" weight={700} color="bad">
                    {onlySlipped ? t('staff.classes.onlySlipped', { exam: shortExam(last?.name ?? '') }) : t('staff.classes.slipped', { exam: shortExam(last?.name ?? '') })}
                  </Text>
                </View>
              ) : c.current_topic ? (
                <Text variant="xs" color="muted">
                  {t('staff.classes.nowOn', { topic: c.current_topic })}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
              <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
                {t('staff.classes.today')}
              </Text>
              <Text variant="xs" color="ink2" weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
                {todayText}
              </Text>
            </View>
            {today.marked ? <RollDots rolls={today.rolls} perRow={20} gap={3} rowGap={5} /> : null}
          </View>
          <View style={[styles.row, { gap: 18, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong, alignItems: 'flex-end' }]}>
            <View>
              <Text variant="xxs" color="muted" weight={700}>
                {t('staff.classes.average', { exam: shortExam(sheet ? sheet.exam.name : (last?.name ?? '')), subject: subject === 'Mathematics' ? 'Maths' : subject })}
              </Text>
              <View style={[styles.row, { gap: 6, alignItems: 'baseline', marginTop: 3 }]}>
                <Text variant="h3" num>
                  {sheet?.percent != null ? `${Math.round(sheet.percent)}%` : last ? `${Math.round(last.average)}%` : '—'}
                </Text>
                {sheet ? (
                  <Text variant="xxs" weight={700} color="warn">
                    {t('staff.classes.draft')}
                  </Text>
                ) : d !== null ? (
                  <Delta value={t('staff.classes.pts', { count: Math.abs(d) })} direction={d > 0 ? 'up' : d < 0 ? 'down' : 'flat'} />
                ) : null}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text variant="xxs" color="muted" weight={700}>
                  {t('staff.classes.syllabus')}
                </Text>
                <Text variant="xs" weight={700} num>
                  {c.syllabus != null ? `${c.syllabus}%` : '—'}
                </Text>
              </View>
              <Bar value={c.syllabus ?? 0} color={colors.pLavInk} size="thin" style={{ marginTop: 8 }} accessibilityLabel={t('staff.classes.syllabusLabel', { percent: c.syllabus ?? 0 })} />
            </View>
          </View>
          {sheet ? (
            <View style={[styles.row, { gap: 12, padding: 12, paddingLeft: 14, borderRadius: 12, backgroundColor: colors.pLav }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700}>
                  {t('staff.classes.marksOpen', { exam: shortExam(sheet.exam.name) })}
                </Text>
                <Text variant="xs" color="ink2">
                  {t('staff.classes.marksIn', { entered: sheet.entered, total: sheet.total })}
                  {sheet.due_on ? (
                    <Text variant="xs" weight={700} color="warn">
                      {' · '}
                      {t('staff.classes.due', { day: weekdayName(sheet.due_on, true) })}
                    </Text>
                  ) : null}
                </Text>
              </View>
              <Button title={t('staff.home.enterMarks')} height={44} onPress={() => router.push({ pathname: '/staff/marks', params: { sheet: sheet.id } })} />
            </View>
          ) : null}
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.line }]}>
          {shortcut(t('staff.classes.attendance'), () => router.push({ pathname: '/staff/attendance', params: { class: c.id } }))}
          {shortcut(t('staff.classes.homework'), () => router.push({ pathname: '/staff/homework', params: { class: c.id } }))}
          {shortcut(t('staff.classes.marks'), () => router.push({ pathname: '/staff/marks', params: sheet ? { sheet: sheet.id } : { class: c.id } }))}
          {shortcut(t('staff.classes.studentsLink'), () => first && router.push({ pathname: '/staff/student', params: { id: first.id } }), true)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  book: { flexDirection: 'row', borderWidth: 1, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderTopRightRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  spine: { width: 28, alignItems: 'center', justifyContent: 'center' },
  spineText: {
    position: 'absolute',
    width: 300,
    maxWidth: 300,
    left: -136,
    top: '50%',
    marginTop: -6,
    textAlign: 'center',
    transform: [{ rotate: '-90deg' }],
    fontFamily: fonts.extrabold,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.9,
    textTransform: 'uppercase',
  },
  plateOuter: { padding: 3, borderWidth: 1, borderRadius: 9 },
  plateInner: { borderWidth: 1, borderRadius: 6, paddingTop: 7, paddingBottom: 9, paddingHorizontal: 14 },
  plate: { fontFamily: fonts.display, fontSize: 38, lineHeight: 40, letterSpacing: -1.5, marginTop: 3 },
  shortcut: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
});
