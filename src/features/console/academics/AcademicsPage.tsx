import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CardHead, Col, ConsolePage, Panel, Row } from '@/features/console/Page';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Bar, Button, EmptyState, Icon, Link, Pill, pointer, SegmentedControl, Sheet, Text, TileIcon, useToast, Well } from '@/ui';

import {
  academicsApi,
  useAcademics,
  useConsoleMutation,
  type AcademicsData,
  type AllocationGap,
  type GradeInfo,
  type SyllabusDetail,
} from './api';
import { dayLabel, HRow, IconText, LegendEntry, mix, SectionBadge, shortDate, Sw, useGradeLabel, useSubjectLabel } from './parts';

export function AcademicsPage() {
  const { t } = useTranslation();
  const query = useAcademics();
  const data = query.data;
  const [plans, setPlans] = useState(false);
  const [allocate, setAllocate] = useState(false);
  const gradeLabel = useGradeLabel();

  const subtitle = data
    ? [
        t('console.academics.page.range', {
          from: gradeLabel(data.structure.grades[0]?.grade ?? ''),
          to: data.structure.grades[data.structure.grades.length - 1]?.grade ?? '',
        }),
        t('console.academics.page.sections', { count: data.structure.sections }),
        t('console.academics.page.teachers', { count: data.teachers }),
        data.term ? t('console.academics.page.term', { term: data.term.name, week: data.term.week }) : null,
        data.next_exam
          ? t('console.academics.page.exams', { name: data.next_exam.name.toLowerCase(), date: dayLabel(data.next_exam.date) })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  return (
    <ConsolePage
      title={t('console.academics.page.title')}
      subtitle={subtitle}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      actions={
        <>
          <Button title={t('console.academics.page.syllabusPlans')} variant="secondary" icon="book" onPress={() => setPlans(true)} />
          <Button title={t('console.academics.page.allocate')} icon="layers" onPress={() => setAllocate(true)} />
        </>
      }>
      {data ? (
        <>
          <Row align="stretch">
            <Col span={8}>
              <Structure data={data} />
            </Col>
            <Col span={4}>
              <AllocationCard data={data} />
            </Col>
          </Row>
          <Row align="stretch">
            <Col span={8}>
              <Coverage data={data} />
            </Col>
            <Col span={4}>
              <HomeworkCard data={data} />
            </Col>
          </Row>
          <SyllabusSheet visible={plans} onClose={() => setPlans(false)} grades={data.syllabus.rows.map((r) => r.grade)} />
          <AllocateSheet visible={allocate} onClose={() => setAllocate(false)} gaps={data.allocation.gaps} />
        </>
      ) : null}
    </ConsolePage>
  );
}

// ------------------------------------------------------------------ grades and sections

function Structure({ data }: { data: AcademicsData }) {
  const { t } = useTranslation();
  const [view, setView] = useState<'teachers' | 'strength'>('teachers');
  const grades = data.structure.grades;
  const rows: GradeInfo[][] = [];
  for (let i = 0; i < grades.length; i += 5) rows.push(grades.slice(i, i + 5));
  return (
    <Panel gap={16} style={{ flex: 1 }}>
      <CardHead
        title={t('console.academics.structure.title')}
        subtitle={t('console.academics.structure.subtitle', {
          students: data.structure.students.toLocaleString('en-IN'),
          sections: data.structure.sections,
        })}
        right={
          <SegmentedControl
            full={false}
            value={view}
            onChange={setView}
            options={[
              { value: 'teachers', label: t('console.academics.structure.classTeachers') },
              { value: 'strength', label: t('console.academics.structure.strength') },
            ]}
          />
        }
      />
      <View style={{ gap: 10 }}>
        {rows.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((g) => (
              <GradeTile key={g.grade} grade={g} view={view} />
            ))}
            {Array.from({ length: 5 - row.length }).map((_, k) => (
              <View key={`e${k}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </View>
    </Panel>
  );
}

function GradeTile({ grade, view }: { grade: GradeInfo; view: 'teachers' | 'strength' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const gradeLabel = useGradeLabel();
  const warn = grade.gaps.length > 0 || grade.no_class_teacher.length > 0 || grade.over_capacity.length > 0;
  const warning = grade.gaps.length
    ? t('console.academics.structure.gap', { subjects: grade.gaps.join(', ') })
    : grade.no_class_teacher.length
      ? t('console.academics.structure.noClassTeacher', { sections: grade.no_class_teacher.join(', ') })
      : grade.over_capacity.length
        ? t('console.academics.structure.overCapacity', { sections: grade.over_capacity.join(', ') })
        : null;
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.subtle, borderColor: warn ? colors.warn : colors.line }]}
      accessible
      accessibilityLabel={`${gradeLabel(grade.grade)}, ${t('console.academics.structure.students', { count: grade.students })}${warning ? `, ${warning}` : ''}`}>
      <HRow style={{ justifyContent: 'space-between' }} gap={6}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {gradeLabel(grade.grade)}
        </Text>
        <HRow gap={3}>
          <Icon name="users" size={14} rawColor={colors.muted} />
          <Text variant="xs" color="muted" num>
            {grade.students}
          </Text>
        </HRow>
      </HRow>
      <View style={{ gap: 4 }}>
        {grade.sections.map((s) => (
          <HRow key={s.id} gap={6}>
            <SectionBadge letter={s.section} />
            {view === 'teachers' ? (
              <Text
                variant="xs"
                rawColor={s.class_teacher ? colors.ink2 : colors.warn}
                weight={s.class_teacher ? undefined : 600}
                numberOfLines={1}
                style={{ flex: 1 }}>
                {s.class_teacher ? s.class_teacher.name : t('console.academics.structure.none')}
              </Text>
            ) : (
              <View style={{ flex: 1, gap: 2 }}>
                <HRow style={{ justifyContent: 'space-between' }}>
                  <Text variant="xs" rawColor={s.over ? colors.warn : colors.ink2} num weight={s.over ? 700 : undefined}>
                    {s.students}/{s.capacity}
                  </Text>
                </HRow>
                <Bar value={s.students} max={Math.max(s.capacity, s.students)} size="thin" tone={s.over ? 'warn' : 'brand'} />
              </View>
            )}
          </HRow>
        ))}
      </View>
      {warning ? (
        <View style={{ marginTop: 'auto' }}>
          <IconText icon="alert" text={warning} color={colors.warn} size={11} />
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ allocation

function useGapText() {
  const { t } = useTranslation();
  const gradeLabel = useGradeLabel();
  return (gap: AllocationGap) => {
    const title =
      gap.sections.length === 1
        ? t('console.academics.allocation.titleOne', {
            grade: gradeLabel(gap.grade),
            section: gap.sections[0].section,
            subject: gap.subject.name,
          })
        : t('console.academics.allocation.titleMany', { grade: gradeLabel(gap.grade), subject: gap.subject.name });
    const parts = [
      gap.sections.length > 1
        ? t('console.academics.allocation.sections', { sections: gap.sections.map((s) => s.section).join(', ') })
        : null,
      gap.sections.length > 1 && gap.periods_each
        ? t('console.academics.allocation.periodsEach', { count: gap.periods })
        : t('console.academics.allocation.periods', { count: gap.periods }),
      gap.reason === 'long_leave'
        ? t('console.academics.allocation.longLeave')
        : gap.since
          ? t('console.academics.allocation.vacantSince', { date: shortDate(gap.since) })
          : t('console.academics.allocation.vacant'),
    ];
    return { title, detail: parts.filter(Boolean).join(' · ') };
  };
}

function AllocationCard({ data }: { data: AcademicsData }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const a = data.allocation;
  return (
    <Panel gap={16} style={{ flex: 1 }}>
      <CardHead
        title={t('console.academics.allocation.title')}
        subtitle={t('console.academics.allocation.subtitle')}
        right={
          a.unassigned ? (
            <Pill tone="warn" label={t('console.academics.allocation.unassigned', { count: a.unassigned })} />
          ) : (
            <Pill tone="ok" label={t('console.academics.allocation.allStaffed')} />
          )
        }
      />
      <View style={{ gap: 8 }}>
        <HRow style={{ justifyContent: 'space-between' }}>
          <Text variant="sm" color="ink2">
            <Trans
              i18nKey="console.academics.allocation.staffed"
              values={{ staffed: a.staffed, required: a.required }}
              components={{ b: <Text variant="sm" weight={700} num /> }}
            />
          </Text>
          <Text variant="xs" color="muted" num>
            {a.percent != null ? `${a.percent}%` : '—'}
          </Text>
        </HRow>
        <Bar
          value={a.staffed}
          max={a.required || 1}
          accessibilityLabel={t('console.academics.allocation.staffed_plain', { staffed: a.staffed, required: a.required })}
        />
      </View>
      {a.gaps.map((gap) => (
        <GapCard key={gap.key} gap={gap} />
      ))}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.navigate('/console/timetable')}
        style={[styles.flowNote, pointer, { backgroundColor: colors.sunken, marginTop: 'auto' }]}>
        <Icon name="calendar" size={16} rawColor={colors.muted} />
        <Text variant="xs" color="ink2" style={{ flex: 1 }}>
          {t('console.academics.allocation.flows')}
        </Text>
        <Link label={t('console.academics.allocation.timetable')} onPress={() => router.navigate('/console/timetable')} size={13} />
      </Pressable>
    </Panel>
  );
}

function GapCard({ gap }: { gap: AllocationGap }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const text = useGapText();
  const { title, detail } = text(gap);
  const assign = useConsoleMutation(
    () =>
      academicsApi.allocate({
        subject_id: gap.subject.id,
        class_group_ids: gap.sections.map((s) => s.id),
        teacher_id: gap.suggestion?.id ?? '',
      }),
    () => toast(t('console.academics.allocation.assigned', { name: gap.suggestion?.name, title })),
  );
  const s = gap.suggestion;
  return (
    <View style={[styles.gap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <HRow gap={12} align="flex-start">
        <TileIcon icon="alert" tone="warn" size="sm" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700}>
            {title}
          </Text>
          <Text variant="xs" color="muted">
            {detail}
          </Text>
        </View>
      </HRow>
      {s ? (
        <HRow gap={10}>
          <Avatar initials={s.initials} seed={s.name} size="xs" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="xs" weight={700}>
              {t('console.academics.allocation.suggested', { name: s.name })}
            </Text>
            <Text variant="xxs" color="muted">
              {t('console.academics.allocation.load', { subjects: s.subjects.join(', '), load: s.load, max: s.max })}
            </Text>
          </View>
          <Button
            title={t('console.academics.allocation.assign')}
            variant="secondary"
            size="sm"
            loading={assign.isPending}
            accessibilityLabel={t('console.academics.allocation.assignLabel', { name: s.name, title })}
            onPress={() => assign.mutate(undefined, { onError: (e) => toast((e as Error).message, 'danger') })}
          />
        </HRow>
      ) : (
        <Text variant="xs" color="warn" weight={600}>
          {t('console.academics.allocation.noSuggestion')}
        </Text>
      )}
    </View>
  );
}

function AllocateSheet({ visible, onClose, gaps }: { visible: boolean; onClose: () => void; gaps: AllocationGap[] }) {
  const { t } = useTranslation();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('console.academics.allocation.sheetTitle')}
      message={gaps.length ? t('console.academics.allocation.sheetHint') : undefined}>
      {gaps.length ? (
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }}>
          {gaps.map((g) => (
            <GapCard key={g.key} gap={g} />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="checkCircle"
          title={t('console.academics.allocation.allStaffedTitle')}
          message={t('console.academics.allocation.allStaffedHint')}
        />
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------ syllabus coverage

function heat(colors: ReturnType<typeof useTheme>['colors'], pct: number) {
  if (pct >= 55) return { bg: mix(colors.brand, colors.surface, 0.8), fg: colors.onBrand };
  if (pct >= 45) return { bg: mix(colors.brand, colors.surface, 0.5), fg: colors.ink };
  if (pct >= 35) return { bg: mix(colors.brand, colors.surface, 0.28), fg: colors.ink };
  return { bg: mix(colors.brand, colors.surface, 0.1), fg: colors.ink };
}

function Coverage({ data }: { data: AcademicsData }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const gradeLabel = useGradeLabel();
  const subjectLabel = useSubjectLabel();
  const s = data.syllabus;
  const alert = s.alert;
  return (
    <Panel gap={16} style={{ flex: 1 }}>
      <CardHead
        title={t('console.academics.syllabus.title')}
        subtitle={
          s.plan_to_date != null
            ? t('console.academics.syllabus.subtitle', { plan: s.plan_to_date })
            : t('console.academics.syllabus.subtitleNoPlan')
        }
        right={
          <HRow gap={16}>
            {[
              [0.1, t('console.academics.syllabus.l1')],
              [0.28, t('console.academics.syllabus.l2')],
              [0.5, t('console.academics.syllabus.l3')],
              [0.8, t('console.academics.syllabus.l4')],
            ].map(([p, label]) => (
              <LegendEntry
                key={String(label)}
                swatch={<Sw color={mix(colors.brand, colors.surface, Number(p))} border={colors.line} />}
                label={String(label)}
              />
            ))}
          </HRow>
        }
      />
      <View accessibilityRole={'table' as never} accessibilityLabel={t('console.academics.syllabus.a11y')}>
        <View style={styles.heatRow} accessibilityRole={'row' as never}>
          <View style={[styles.heatGrade, { paddingBottom: 0 }]}>
            <Text style={[styles.th, { color: colors.muted }]}>{t('console.academics.syllabus.grade')}</Text>
          </View>
          {s.subjects.map((sub) => (
            <View key={sub.code} style={styles.heatCol} accessibilityRole={'columnheader' as never}>
              <Text style={[styles.th, { color: colors.muted, textAlign: 'center' }]} numberOfLines={1}>
                {subjectLabel(sub.code, sub.name)}
              </Text>
            </View>
          ))}
        </View>
        {s.rows.map((row) => (
          <View key={row.grade} style={styles.heatRow} accessibilityRole={'row' as never}>
            <View style={[styles.heatGrade, { paddingVertical: 4 }]} accessibilityRole={'rowheader' as never}>
              <Text variant="sm" weight={700} style={{ fontSize: 13 }}>
                {gradeLabel(row.grade)}
              </Text>
            </View>
            {row.cells.map((c) => {
              if (c.percent == null) {
                return (
                  <View key={c.code} style={styles.heatCol} accessibilityRole={'cell' as never}>
                    <View style={[styles.heatCell, { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line }]}>
                      <Text variant="xs" color="muted">
                        {t('console.academics.syllabus.na')}
                      </Text>
                    </View>
                  </View>
                );
              }
              const h = heat(colors, c.percent);
              return (
                <View key={c.code} style={styles.heatCol} accessibilityRole={'cell' as never}>
                  <View
                    style={[
                      styles.heatCell,
                      { backgroundColor: c.behind ? mix(colors.brand, colors.surface, 0.1) : h.bg },
                      c.behind && { boxShadow: `inset 0 0 0 2px ${colors.bad}` },
                    ]}
                    accessibilityLabel={
                      c.behind ? t('console.academics.syllabus.behindCell', { percent: c.percent, plan: c.planned }) : `${c.percent}%`
                    }>
                    {c.behind ? <Icon name="alert" size={14} rawColor={colors.bad} bold /> : null}
                    <Text rawColor={c.behind ? colors.ink : h.fg} weight={650} num style={{ fontSize: 12.5 }}>
                      {c.percent}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {alert ? (
        <View style={[styles.alert, { backgroundColor: colors.badSoft }]}>
          <Icon name="alert" size={16} rawColor={colors.bad} />
          <Text variant="xs" color="ink2" style={{ flex: 1 }}>
            <Text variant="xs" weight={700} color="ink">
              {t('console.academics.syllabus.alertLead', {
                grade: gradeLabel(alert.grade),
                subject: alert.subject.name,
                gap: alert.gap,
                percent: alert.percent,
              })}
            </Text>
            {alert.exam_drop
              ? ` ${t('console.academics.syllabus.alertDrop', { count: Math.abs(alert.exam_drop.delta), exam: alert.exam_drop.exam })}`
              : ''}
            {alert.trailing.length
              ? ` ${t('console.academics.syllabus.alertTrailing', { subject: alert.trailing[0].name, grades: alert.trailing[0].grades })}`
              : ''}
          </Text>
          <Link label={t('console.academics.syllabus.seeResults')} onPress={() => router.navigate('/console/exams')} />
        </View>
      ) : null}
    </Panel>
  );
}

function SyllabusSheet({ visible, onClose, grades }: { visible: boolean; onClose: () => void; grades: string[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const gradeLabel = useGradeLabel();
  const [grade, setGrade] = useState(grades.find((g) => g === '9') ?? grades[0] ?? '');
  const [detail, setDetail] = useState<SyllabusDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const load = (g: string) => {
    setGrade(g);
    setLoading(true);
    academicsApi
      .syllabus(g)
      .then(setDetail)
      .finally(() => setLoading(false));
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={t('console.academics.plans.title')} message={t('console.academics.plans.hint')}>
      <ScrollView horizontal contentContainerStyle={{ gap: 6 }} onLayout={() => (!detail && !loading && grade ? load(grade) : undefined)}>
        {grades.map((g) => (
          <Button key={g} title={gradeLabel(g)} size="sm" variant={g === grade ? 'primary' : 'secondary'} onPress={() => load(g)} />
        ))}
      </ScrollView>
      <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8 }}>
        {detail && detail.grade === grade
          ? detail.items.map((i) => (
              <View key={`${i.section}${i.code}`} style={{ gap: 4 }}>
                <HRow style={{ justifyContent: 'space-between' }}>
                  <Text variant="xs" weight={700}>
                    {i.section} · {i.subject}
                  </Text>
                  <Text variant="xs" color={i.planned != null && i.planned - i.percent >= 10 ? 'bad' : 'muted'} num>
                    {i.planned != null ? t('console.academics.plans.ofPlan', { percent: i.percent, plan: i.planned }) : `${i.percent}%`}
                  </Text>
                </HRow>
                <View style={{ position: 'relative' }}>
                  <Bar value={i.percent} size="thin" />
                  {i.planned != null ? <View style={[styles.planTick, { left: `${i.planned}%`, borderColor: colors.ink2 }]} /> : null}
                </View>
                {i.topic || i.teacher ? (
                  <Text variant="xxs" color="muted">
                    {[i.topic, i.teacher].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            ))
          : null}
        {detail && detail.grade === grade && !detail.items.length ? (
          <Text variant="sm" color="muted">
            {t('console.academics.plans.empty')}
          </Text>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

// ------------------------------------------------------------------ homework

function HomeworkCard({ data }: { data: AcademicsData }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const gradeLabel = useGradeLabel();
  const hw = data.homework;
  const scale = Math.max(Math.ceil(hw.limit / 0.75), ...hw.rows.map((r) => r.per_section));
  const notify = useConsoleMutation(
    () => academicsApi.notifyHomework(hw.over),
    (r) => toast(t('console.academics.homework.sent', { count: r.sent_to })),
  );
  const summary = hw.rows.map((r) => `${gradeLabel(r.grade)} ${r.per_section}`).join(', ');
  // "Grades 9 and 10" for number grades, "Grade 9" for one.
  const overText =
    hw.over.length > 1
      ? t('console.academics.common.grades', {
          range: t('console.academics.homework.andList', { first: hw.over.slice(0, -1).join(', '), last: hw.over[hw.over.length - 1] }),
        })
      : gradeLabel(hw.over[0] ?? '');
  return (
    <Panel gap={16} style={{ flex: 1 }}>
      <CardHead
        title={t('console.academics.homework.title')}
        subtitle={t('console.academics.homework.subtitle', {
          from: dayLabel(hw.week_start).replace(/ \w+$/, ''),
          to: dayLabel(hw.week_end),
        })}
      />
      <HRow gap={16}>
        <LegendEntry swatch={<Sw color={colors.brand} />} label={t('console.academics.homework.perSection')} />
        <LegendEntry
          swatch={<View style={{ height: 12, borderLeftWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink2 }} />}
          label={t('console.academics.homework.limit', { limit: hw.limit })}
        />
      </HRow>
      <View
        style={{ gap: 12 }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('console.academics.homework.a11y', { summary, limit: hw.limit })}>
        {hw.rows.map((r) => (
          <HRow key={r.grade} gap={10}>
            <Text variant="xs" weight={600} color="ink2" style={{ width: 58 }}>
              {gradeLabel(r.grade)}
            </Text>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Bar value={r.per_section} max={scale} tone={r.over ? 'warn' : 'brand'} />
              <View style={[styles.limit, { left: `${(hw.limit / scale) * 100}%`, borderColor: colors.ink2 }]} />
            </View>
            <Text variant="xs" weight={r.over ? 800 : 600} num style={{ width: 22, textAlign: 'right' }}>
              {r.per_section}
            </Text>
            <Text variant="xxs" weight={700} color="warn" style={{ width: 34 }}>
              {r.over ? t('console.academics.homework.over') : ''}
            </Text>
          </HRow>
        ))}
      </View>
      <Well style={{ gap: 10, marginTop: 'auto' }} pad={12}>
        {hw.over.length ? (
          <>
            <Text variant="xs" color="ink2">
              <Text variant="xs" weight={700} color="ink">
                {t('console.academics.homework.overLead', { count: hw.over.length, grades: overText })}
              </Text>
              {hw.exam_soon ? ` ${t('console.academics.homework.runUp')}` : ''}
              {hw.worst?.busiest_day
                ? `; ${t('console.academics.homework.busiest', { count: hw.worst.busiest_count, grade: gradeLabel(hw.worst.grade), total: hw.worst.per_section, day: dayLabel(hw.worst.busiest_day) })}`
                : ''}
              .
            </Text>
            <Button
              title={t('console.academics.homework.notify')}
              variant="secondary"
              size="sm"
              icon="chat"
              loading={notify.isPending}
              style={{ alignSelf: 'flex-start' }}
              onPress={() => notify.mutate(undefined, { onError: (e) => toast((e as Error).message, 'danger') })}
            />
          </>
        ) : (
          <Text variant="xs" color="ink2">
            {t('console.academics.homework.allWithin', { limit: hw.limit })}
          </Text>
        )}
      </Well>
    </Panel>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 16, padding: 10, gap: 8 },
  gap: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  flowNote: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  heatRow: { flexDirection: 'row', alignItems: 'center' },
  heatGrade: { width: 112, paddingRight: 12 },
  heatCol: { flex: 1, minWidth: 0, padding: 3 },
  heatCell: { height: 30, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  th: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.88, textTransform: 'uppercase', paddingBottom: 5 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  limit: { position: 'absolute', top: -4, bottom: -4, borderLeftWidth: 1.5, borderStyle: 'dashed' },
  planTick: { position: 'absolute', top: -3, bottom: -3, borderLeftWidth: 1.5 },
});
