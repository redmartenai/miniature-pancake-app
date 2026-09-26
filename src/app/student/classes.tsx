import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { ClassSubject } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { shortSubject } from '@/features/parent/HomeCards';
import { clockShort, formatClock, weekdayName } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, pastel, type Pastel } from '@/theme/tokens';
import { bgImage, Button, ErrorState, Highlight, Kicker, LoadingCards, Pill, pointer, Screen, StickyNote, Text, AppBar } from '@/ui';

const SPINES: Pastel[] = ['blue', 'pink', 'mint', 'peach', 'butter', 'lav'];
const HEIGHTS = [196, 184, 188, 178, 200, 192];

/** StuClasses: every subject as a book on a shelf, with its teacher, next lesson and syllabus progress. */
export default function StudentClasses() {
  const { t } = useTranslation();
  const school = useActiveSchool();
  const family = useFamily();
  const me = family.selected;
  const id = me?.id;
  const classes = useQuery({ queryKey: ['student-classes', id], queryFn: () => api.studentClasses(id as string), enabled: !!id });
  const exams = useQuery({ queryKey: ['exams', id], queryFn: () => api.exams(id as string), enabled: !!id });
  const data = classes.data;
  const subjects = data?.subjects ?? [];
  const fresh = subjects.filter((s) => s.new_materials > 0).sort((a, b) => b.new_materials - a.new_materials);
  const tracked = subjects.filter((s) => s.syllabus != null);
  const behind = tracked.length ? tracked.reduce((a, b) => ((b.syllabus ?? 0) < (a.syllabus ?? 0) ? b : a)) : undefined;

  // Two books per shelf; the class in session is laid flat as an open drawing book, so give it more room.
  const shelves: ClassSubject[][] = [];
  for (let i = 0; i < subjects.length; i += 2) shelves.push(subjects.slice(i, i + 2));

  return (
    <Screen
      gap={18}
      dock
      refreshing={classes.isRefetching}
      onRefresh={classes.refetch}
      header={
        <AppBar
          back={() => router.navigate('/student/me')}
          subtitle={[me ? t('student.home.classLabel', { class: me.class.short_label }) : null, school?.term].filter(Boolean).join(' · ')}
          title={t('student.classes.title')}
        />
      }>
      {classes.error ? <ErrorState error={classes.error} onRetry={classes.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data && fresh.length ? (
        <View style={{ paddingTop: 12, paddingRight: 34, paddingLeft: 4 }}>
          <StickyNote color="lav" tilt="l" tape="right" style={[styles.row, { paddingTop: 20, paddingRight: 14, paddingBottom: 14, paddingLeft: 16, gap: 12 }]}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text variant="sm" weight={800}>
                {t('student.classes.newMaterial', { count: data.new_total })}
              </Text>
              <Text variant="xs" color="ink2" numberOfLines={1}>
                {fresh.map((s) => `${shortSubject(s.subject.name)} ${s.new_materials}`).join(' · ')}
              </Text>
            </View>
            <Button title={t('student.classes.open')} height={44} onPress={() => router.push('/student/material')} />
          </StickyNote>
        </View>
      ) : null}
      {data && subjects.length ? (
        <View style={{ gap: 10, paddingTop: 4 }}>
          <Kicker>{t('student.classes.shelf', { count: subjects.length })}</Kicker>
          <Text variant="sm" color="ink2">
            <Trans
              i18nKey="student.classes.sentence"
              values={{ exam: exams.data?.exam?.name.toLowerCase() ?? t('student.classes.term'), amount: t(`student.classes.fraction.${fraction(data.syllabus_average)}`) }}
              components={{ b: <Highlight color="lav" style={{ fontWeight: '700' }} /> }}
            />
            {behind && behind.syllabus != null && tracked.length > 1 ? ` ${t('student.classes.behind', { subject: behind.subject.name, percent: behind.syllabus })}` : ''}
          </Text>
        </View>
      ) : null}
      {shelves.map((pair, s) => {
        const wide = pair.findIndex((c) => !!c.now);
        return (
          <View key={s} style={{ paddingTop: wide >= 0 ? 10 : 14 }}>
            <View style={[styles.row, { gap: 14, paddingLeft: 4, paddingRight: 6, alignItems: 'flex-end' }]}>
              {pair.map((c, i) => {
                const index = s * 2 + i;
                const flex = wide < 0 || pair.length === 1 ? 1 : i === wide ? 3 : 2;
                return (
                  <View key={c.subject.id} style={{ flex, minWidth: 0 }}>
                    {c.now ? (
                      <DrawingBook subject={c} />
                    ) : (
                      <Book subject={c} tone={index < SPINES.length ? SPINES[index] : undefined} height={index < HEIGHTS.length ? HEIGHTS[index] : 162} tabOffset={[16, 22, 14][index % 3]} behind={c === behind && tracked.length > 1} compact={flex === 2} />
                    )}
                  </View>
                );
              })}
              {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
            <ShelfBoard />
          </View>
        );
      })}
    </Screen>
  );
}

/** Rough words for how much of the syllabus is done, so the sentence reads like a person wrote it. */
function fraction(percent: number | null): string {
  if (percent == null) return 'some';
  if (percent < 20) return 'little';
  if (percent < 30) return 'quarter';
  if (percent < 42) return 'third';
  if (percent < 58) return 'half';
  if (percent < 71) return 'twoThirds';
  if (percent < 85) return 'threeQuarters';
  return 'most';
}

function ShelfBoard() {
  const { colors } = useTheme();
  return <View style={{ height: 8, borderRadius: 3, backgroundColor: colors.lineStrong }} />;
}

function nextLabel(c: ClassSubject) {
  return c.next ? `${weekdayName(c.next.date, true)} ${formatClock(c.next.starts_at)}` : '—';
}

function Progress({ percent, color, warn }: { percent: number | null; color: string; warn?: boolean }) {
  const { colors } = useTheme();
  if (percent == null) return null;
  return (
    <View style={[styles.row, { gap: 6, marginTop: 5 }]}>
      <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(100, percent)}%`, height: 3, backgroundColor: color }} />
      </View>
      <Text variant="xxs" weight={warn ? 800 : 700} num rawColor={warn ? colors.warn : colors.ink}>
        {percent}%
      </Text>
    </View>
  );
}

function Book({ subject: c, tone, height, tabOffset, behind, compact }: { subject: ClassSubject; tone?: Pastel; height: number; tabOffset: number; behind: boolean; compact: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useActiveSchool();
  const p = tone ? pastel(colors, tone) : { bg: colors.sunken, ink: colors.ink2 };
  const label = [
    t('student.classes.bookLabel', { subject: c.subject.name, teacher: c.teacher }),
    c.is_class_teacher ? t('student.classes.yourClassTeacher') : null,
    c.next ? t('student.classes.nextLabel', { when: `${weekdayName(c.next.date)} ${clockShort(c.next.starts_at)}` }) : null,
    c.syllabus != null ? t('student.classes.syllabusLabel', { percent: c.syllabus }) : null,
    c.new_materials ? t('student.classes.newLabel', { count: c.new_materials }) : null,
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/student/material', params: { subject: c.subject.code } })}
      style={[styles.book, { minHeight: tone ? height : 162, backgroundColor: p.bg, boxShadow: `${tone ? '' : `0 0 0 1px ${colors.line}, `}3px 3px 0 -1px ${colors.surface}, 3px 3px 0 0 ${colors.lineStrong}` }, pointer]}>
      {c.new_materials ? (
        <View style={[styles.tab, { right: tabOffset, backgroundColor: colors.pPink }]}>
          <Text rawColor={colors.pPinkInk} weight={800} style={styles.tabText}>
            {t('student.classes.new', { count: c.new_materials })}
          </Text>
        </View>
      ) : null}
      <View style={[styles.spine, { width: tone ? 14 : 12, backgroundColor: tone ? p.ink : colors.ink2 }]}>
        <View style={{ position: 'absolute', top: 8, bottom: 8, left: tone ? 6 : 5, borderLeftWidth: 1.5, borderStyle: 'dashed', borderLeftColor: p.bg }} />
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingTop: compact || !tone ? 10 : 12, paddingBottom: compact || !tone ? 10 : 12, paddingLeft: compact || !tone ? 8 : 10, paddingRight: compact || !tone ? 8 : 11, gap: 10 }}>
        {tone ? (
          <Text variant="xxs" weight={800} rawColor={p.ink} numberOfLines={1} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
            {school?.short_name ?? school?.initials}
          </Text>
        ) : null}
        <View style={[styles.label, { backgroundColor: colors.surface, boxShadow: `0 0 0 1px ${colors.lineStrong}`, padding: tone ? 10 : 8, paddingBottom: tone ? 9 : 8 }]}>
          <Text style={styles.title}>{c.subject.name}</Text>
          <Text variant={tone ? 'xs' : 'xxs'} color="muted" numberOfLines={1}>
            {c.teacher}
          </Text>
          {c.is_class_teacher ? (
            <Text variant="xxs" weight={700} rawColor={p.ink}>
              {t('student.classes.yourClassTeacher')}
            </Text>
          ) : null}
          <View style={[styles.row, styles.dashTop, { gap: 5, borderTopColor: colors.lineStrong }]}>
            {tone ? (
              <Text variant="xxs" color="muted" weight={600}>
                {t('student.classes.next')}
              </Text>
            ) : null}
            <Text variant={tone ? 'xs' : 'xxs'} weight={700} num numberOfLines={1} style={{ flexShrink: 1 }}>
              {nextLabel(c)}
            </Text>
          </View>
          <Progress percent={c.syllabus} color={tone ? p.ink : colors.ink2} warn={behind} />
        </View>
      </View>
    </Pressable>
  );
}

/** The subject in class right now: a spiral-bound drawing book lying on the shelf. */
function DrawingBook({ subject: c }: { subject: ClassSubject }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const kind = c.subject.code === 'ART' ? t('student.classes.drawingBook') : t('student.classes.notebook');
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={[t('student.classes.bookLabel', { subject: c.subject.name, teacher: c.teacher }), t('student.classes.nowLabel', { time: clockShort(c.now!.ends_at) }), c.syllabus != null ? t('student.classes.syllabusLabel', { percent: c.syllabus }) : null].filter(Boolean).join('. ')}
      onPress={() => router.push('/student/schedule')}
      style={[
        styles.drawing,
        { backgroundColor: colors.surface, boxShadow: `0 0 0 1px ${colors.lineStrong}, 3px 3px 0 -1px ${colors.surface}, 3px 3px 0 0 ${colors.lineStrong}` },
        pointer,
      ]}>
      <View style={[styles.spiral, bgImage(`repeating-linear-gradient(90deg, ${colors.ink2} 0 2px, transparent 2px 9px)`)]} />
      <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
        <Text style={styles.title}>{c.subject.name}</Text>
        <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
          {kind}
        </Text>
      </View>
      <Text variant="xs" color="muted" numberOfLines={1} style={{ marginTop: -6 }}>
        {c.teacher}
      </Text>
      <Pill label={t('student.classes.nowTill', { time: clockShort(c.now!.ends_at) })} tone="ok" style={{ alignSelf: 'flex-start' }} />
      <View style={{ marginTop: 'auto' }}>
        <Progress percent={c.syllabus} color={colors.ink2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  book: { flexDirection: 'row', borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  spine: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  tab: { position: 'absolute', zIndex: -1, top: -15, height: 26, paddingHorizontal: 8, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  tabText: { fontSize: 10, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  label: { marginTop: 'auto', borderRadius: 8, gap: 1 },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 19 },
  dashTop: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderStyle: 'dashed' },
  drawing: { minHeight: 138, paddingTop: 20, paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  spiral: { position: 'absolute', top: -6, left: 14, right: 14, height: 14 },
});
