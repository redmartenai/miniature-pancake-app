import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { request } from '@/api/client';
import { API_URL } from '@/lib/config';
import { formatTime } from '@/lib/format';
import { CardHead, Col, ConsolePage, Panel, Row } from '@/features/console/Page';
import { DataTable, type Column } from '@/features/console/Table';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, toneColors, type Tone } from '@/theme/tokens';
import {
  Avatar,
  Badge,
  Bar,
  Button,
  Card,
  Icon,
  IconButton,
  Link,
  Pill,
  Sheet,
  Text,
  TextField,
  TileIcon,
  useToast,
  Well,
  type PillTone,
} from '@/ui';

import {
  academicsApi,
  useConsoleMutation,
  useExams,
  type CellState,
  type CheckItem,
  type Checklist,
  type Matrix,
  type MatrixCell,
  type Moderation,
  type Trend,
  type Upcoming,
} from './api';
import { dayLabel, HRow, LegendEntry, PickerSheet, shortDate, Sw, useGradeLabel, useSubjectLabel, weekdayShort } from './parts';

const STATE_TONE: Record<CellState, PillTone> = {
  published: 'ok',
  review: 'info',
  submitted: 'brand',
  progress: 'warn',
  not_started: 'bad',
};
const STATE_ORDER: CellState[] = ['published', 'review', 'submitted', 'progress', 'not_started'];

export function ExamsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [term, setTerm] = useState<string | undefined>(undefined);
  const [picker, setPicker] = useState(false);
  const query = useExams(term);
  const data = query.data;
  const series = data?.series ?? '';
  const publish = useConsoleMutation(
    () => academicsApi.publishResults(series),
    (r) => toast(t('console.academics.exams.publishedToast', { count: r.published, sections: r.sections })),
  );
  const counts = data?.matrix?.counts;
  const status = !counts ? null : counts.published === data?.matrix?.papers ? 'published' : counts.published ? 'publishing' : 'entry';
  const up = data?.upcoming;
  const subtitle = data
    ? [
        status && data.series ? t(`console.academics.exams.status_${status}`, { series: data.series }) : null,
        up ? t('console.academics.exams.upcoming', { name: up.name.toLowerCase(), date: dayLabel(up.first), count: up.days }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  const check = data?.checklist;
  const termLabel = data?.term
    ? `${data.term}${data.academic_year ? ` · ${data.academic_year.replace('–', '-')}` : ''}`
    : t('console.academics.exams.allTerms');

  return (
    <ConsolePage
      title={t('console.academics.exams.title')}
      crumbs={[{ label: t('console.shell.nav.academics'), href: '/console/academics' }]}
      subtitle={subtitle}
      loading={query.isLoading && !data}
      error={query.error}
      onRetry={() => void query.refetch()}
      actions={
        <>
          <Button title={termLabel} variant="secondary" icon="calendar" iconRight="chevronDown" onPress={() => setPicker(true)} />
          <Button
            title={t('console.academics.exams.publish')}
            icon="send"
            disabled={!check?.can_publish}
            loading={publish.isPending}
            accessibilityHint={
              check && !check.can_publish
                ? t(check.failures.length ? 'console.academics.exams.blocked' : 'console.academics.exams.nothingToPublish')
                : undefined
            }
            onPress={() => publish.mutate(undefined, { onError: (e) => toast((e as Error).message, 'danger') })}
          />
        </>
      }>
      {data ? (
        <>
          {data.matrix && data.series ? (
            <MarksMatrix series={data.series} matrix={data.matrix} />
          ) : (
            <Card pad={22}>
              <Text variant="sm" color="muted">
                {t('console.academics.exams.noExam')}
              </Text>
            </Card>
          )}
          {data.series && data.checklist && data.moderation ? (
            <Row align="stretch">
              <Col span={4}>
                <ChecklistCard series={data.series} check={data.checklist} published={data.matrix?.counts.published ?? 0} />
              </Col>
              <Col span={4}>
                <ModerationCard series={data.series} queue={data.moderation} />
              </Col>
              <Col span={4}>
                {data.trend ? (
                  <TrendCard trend={data.trend} />
                ) : (
                  <Panel style={{ flex: 1 }}>
                    <Text variant="sm" color="muted">
                      {t('console.academics.exams.noTrend')}
                    </Text>
                  </Panel>
                )}
              </Col>
            </Row>
          ) : null}
          {up ? <UpcomingCard up={up} /> : null}
          <PickerSheet
            visible={picker}
            onClose={() => setPicker(false)}
            title={t('console.academics.exams.pickTerm')}
            options={data.terms.map((x) => ({ id: x.name, label: x.name, detail: `${shortDate(x.starts_on)} – ${shortDate(x.ends_on)}` }))}
            value={data.term ?? undefined}
            onPick={setTerm}
          />
        </>
      ) : null}
    </ConsolePage>
  );
}

// ------------------------------------------------------------------ marks entry

function StatePill({ state, count }: { state: CellState; count?: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = t(`console.academics.exams.state_${state}`);
  if (count == null) return <Pill tone={STATE_TONE[state]} label={label} />;
  const { fg, bg } = toneColors(colors, STATE_TONE[state] as Tone);
  return (
    <View style={[styles.countPill, { backgroundColor: bg }]} accessible accessibilityLabel={`${label} ${count}`}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Text rawColor={fg} style={{ fontFamily: fonts.semibold, fontSize: 12 }}>
        {label}
      </Text>
      <Text rawColor={fg} num style={{ fontFamily: fonts.bold, fontSize: 12 }}>
        {count}
      </Text>
    </View>
  );
}

function MarksMatrix({ series, matrix }: { series: string; matrix: Matrix }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const gradeLabel = useGradeLabel();
  const subjectLabel = useSubjectLabel();
  const complete = matrix.complete.length
    ? t('console.academics.common.grades', { range: matrix.complete.join(t('console.academics.exams.and')) })
    : '';
  const columns: Column<Matrix['rows'][number]>[] = [
    {
      key: 'grade',
      title: t('console.academics.exams.grade'),
      width: 102,
      render: (r) => (
        <Text variant="sm" weight={700} style={{ fontSize: 13.5 }}>
          {gradeLabel(r.grade)}
        </Text>
      ),
    },
    ...matrix.subjects.map((s, i) => ({
      key: s.code,
      title: s.code === 'MATH' || s.code === 'SCI' || s.code === 'ENG' || s.code === 'HIN' ? s.name : subjectLabel(s.code, s.name),
      flex: 1,
      render: (r: Matrix['rows'][number]) => <MatrixCellView cell={r.cells[i]} />,
    })),
    {
      key: 'published',
      title: t('console.academics.exams.published'),
      width: 130,
      align: 'right',
      render: (r) => (
        <HRow gap={10}>
          <Bar value={r.published} max={r.total || 1} size="thin" tone={r.published === r.total ? 'ok' : 'brand'} style={{ width: 64 }} />
          <Text variant="sm" weight={700} num style={{ width: 28, textAlign: 'right' }}>
            {r.published}/{r.total}
          </Text>
        </HRow>
      ),
    },
  ];
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <CardHead
        style={{ paddingTop: 20, paddingHorizontal: 22, paddingBottom: 16, alignItems: 'flex-start' }}
        title={t('console.academics.exams.matrixTitle', { series })}
        subtitle={[
          t('console.academics.common.grades', { range: matrix.grades }),
          t('console.academics.exams.papers', { count: matrix.papers }),
          matrix.max_marks ? t('console.academics.exams.outOf', { max: matrix.max_marks }) : null,
          complete ? t('console.academics.exams.complete', { grades: complete }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        right={
          <HRow gap={6} style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {STATE_ORDER.map((s) => (matrix.counts[s] ? <StatePill key={s} state={s} count={matrix.counts[s]} /> : null))}
          </HRow>
        }
      />
      <DataTable columns={columns} rows={matrix.rows} rowKey={(r) => r.grade} rowHeight={68} />
      {!matrix.rows.length ? (
        <View style={{ padding: 22, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text variant="sm" color="muted">
            {t('console.academics.exams.noSheets')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function MatrixCellView({ cell }: { cell: MatrixCell }) {
  const { t } = useTranslation();
  if (!cell.state)
    return (
      <Text variant="xs" color="faint">
        —
      </Text>
    );
  let note = '';
  if ((cell.state === 'published' || cell.state === 'submitted') && cell.date) note = shortDate(cell.date);
  else if (cell.state === 'review' && cell.note)
    note = cell.note.kind === 'reopened' ? t('console.academics.exams.reopened', { count: cell.note.count }) : cell.note.text;
  else if (cell.state === 'progress') note = t('console.academics.exams.entered', { entered: cell.entered, total: cell.total });
  else if (cell.state === 'not_started')
    note = cell.teacher_on_leave
      ? t('console.academics.exams.teacherOnLeave')
      : cell.due
        ? t('console.academics.exams.due', { date: shortDate(cell.due) })
        : '';
  return (
    <View
      style={{ gap: 4, alignItems: 'flex-start' }}
      accessible
      accessibilityLabel={`${t(`console.academics.exams.state_${cell.state}`)}${note ? `, ${note}` : ''}`}>
      <StatePill state={cell.state} />
      <Text variant="xxs" color="muted" num numberOfLines={1} style={{ paddingLeft: 2 }}>
        {note}
      </Text>
    </View>
  );
}

// ------------------------------------------------------------------ checklist

function ChecklistCard({ series, check, published }: { series: string; check: Checklist; published: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const unpublished = check.items.find((i): i is Extract<CheckItem, { key: 'submitted' }> => i.key === 'submitted');
  const total = unpublished?.total ?? 0;
  const action = useConsoleMutation(
    (a: 'lock_grading' | 'approve_template') => academicsApi.seriesAction(series, a),
    () => toast(t('console.academics.exams.saved')),
  );
  const short = series.replace(/Unit Test (\d+)/, 'UT$1');
  return (
    <Panel gap={6} style={{ flex: 1 }}>
      <CardHead
        title={t('console.academics.exams.checkTitle')}
        subtitle={t('console.academics.exams.checkSubtitle', { left: total - published, total })}
        right={
          <Text variant="xs" color="muted" weight={700} num>
            {t('console.academics.exams.okOf', { ok: check.ok, total: check.total })}
          </Text>
        }
      />
      <View>
        {check.items.map((item, i) => {
          const done = item.state === 'ok';
          const icon = done ? 'checkCircle' : item.state === 'warn' || item.state === 'fail' ? 'alert' : 'circle';
          const color = done ? colors.ok : item.state === 'warn' ? colors.warn : item.state === 'fail' ? colors.bad : colors.lineStrong;
          const detail = checkDetail(t, item, short);
          return (
            <View
              key={item.key}
              style={[styles.checkRow, { borderBottomColor: colors.line, borderBottomWidth: i === check.items.length - 1 ? 0 : 1 }]}
              accessible
              accessibilityLabel={`${t(`console.academics.exams.a11y_${item.state}`)}: ${t(`console.academics.exams.check_${item.key}`)}`}>
              <Icon name={icon} size={20} rawColor={color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} color={done ? 'muted' : 'ink'}>
                  {t(`console.academics.exams.check_${item.key}`)}
                </Text>
                <Text variant="xs" color="muted">
                  {detail}
                </Text>
              </View>
              {item.state === 'fail' && (item.key === 'grading' || item.key === 'template') ? (
                <Button
                  title={t(item.key === 'grading' ? 'console.academics.exams.lock' : 'console.academics.exams.approve')}
                  size="sm"
                  variant="secondary"
                  loading={action.isPending}
                  onPress={() =>
                    action.mutate(item.key === 'grading' ? 'lock_grading' : 'approve_template', {
                      onError: (e) => toast((e as Error).message, 'danger'),
                    })
                  }
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <Well style={{ flexDirection: 'row', gap: 10, marginTop: 'auto', alignItems: 'center' }} pad={12}>
        <Icon name="info" size={16} rawColor={colors.muted} />
        <Text variant="xs" color="ink2" style={{ flex: 1 }}>
          {check.failures.length ? (
            t('console.academics.exams.blocked')
          ) : check.release.sheets ? (
            <>
              {t('console.academics.exams.releaseLead')}{' '}
              <Text variant="xs" weight={700} color="ink">
                {t('console.academics.exams.releasePapers', { count: check.release.papers || check.release.sheets })}
              </Text>
              {check.release.held ? t('console.academics.exams.releaseHeld', { count: check.release.held }) : '.'}
            </>
          ) : (
            t('console.academics.exams.nothingToPublish')
          )}
        </Text>
      </Well>
    </Panel>
  );
}

function checkDetail(t: (k: string, o?: Record<string, unknown>) => string, item: CheckItem, short: string): string {
  switch (item.key) {
    case 'grading':
      return item.state === 'ok'
        ? t('console.academics.exams.d_grading', { series: short, weightage: item.weightage, term: item.term })
        : t('console.academics.exams.d_gradingOpen');
    case 'template':
      return item.state === 'ok'
        ? t('console.academics.exams.d_template', { date: item.on ? shortDate(item.on) : '' })
        : t('console.academics.exams.d_templateOpen');
    case 'submitted':
      return item.state === 'ok'
        ? t('console.academics.exams.d_submittedAll', { total: item.total })
        : [
            t('console.academics.exams.d_submitted', { done: item.done, total: item.total }),
            [
              item.progress ? t('console.academics.exams.inProgress', { count: item.progress }) : null,
              item.not_started ? t('console.academics.exams.notStarted', { count: item.not_started }) : null,
            ]
              .filter(Boolean)
              .join(', '),
          ]
            .filter(Boolean)
            .join(' · ');
    case 'moderation':
      return item.state === 'ok'
        ? t('console.academics.exams.d_moderationClear')
        : [
            item.corrections ? t('console.academics.exams.d_corrections', { count: item.corrections }) : null,
            item.first,
            item.sheets ? t('console.academics.exams.d_sheets', { count: item.sheets }) : null,
          ]
            .filter(Boolean)
            .join(' · ');
    case 'remarks':
      return t('console.academics.exams.d_remarks', { done: item.done, total: item.total, grades: item.grades });
    case 'notify':
      return item.state === 'ok' && item.at
        ? t('console.academics.exams.d_notified', { date: shortDate(item.at.slice(0, 10)) })
        : t('console.academics.exams.d_notify');
  }
}

// ------------------------------------------------------------------ moderation

function ModerationCard({ series, queue }: { series: string; queue: Moderation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const onError = (e: unknown) => toast((e as Error).message, 'danger');
  const decide = useConsoleMutation(
    ({ id, index, decision }: { id: string; index: number; decision: 'accept' | 'reject' }) =>
      academicsApi.decideEntry(id, index, decision),
    (_r, a) => toast(t(a.decision === 'accept' ? 'console.academics.exams.accepted' : 'console.academics.exams.rejected')),
  );
  const approveAll = useConsoleMutation(
    () => academicsApi.approveAll(series),
    () => toast(t('console.academics.exams.allApproved')),
  );
  const moderate = useConsoleMutation(
    (id: string) => academicsApi.moderateSheet(id),
    () => toast(t('console.academics.exams.moderated')),
  );
  const entries = queue.corrections.reduce((n, c) => n + c.entries.length, 0);
  const [expanded, setExpanded] = useState(false);
  const more = !expanded && queue.corrections.length > 0 && (queue.corrections.length > 1 || queue.sheets.length > 0);
  return (
    <Panel gap={10} style={{ flex: 1 }}>
      <CardHead
        title={
          <HRow gap={10}>
            <Text variant="h3" accessibilityRole="header">
              {t('console.academics.exams.modTitle')}
            </Text>
            {queue.count ? <Badge value={queue.count} tone="bad" /> : null}
          </HRow>
        }
        right={queue.corrections.length ? <Pill tone="warn" dot={false} label={t('console.academics.exams.needsApproval')} /> : null}
      />
      {!queue.count ? (
        <Text variant="sm" color="muted">
          {t('console.academics.exams.modEmpty')}
        </Text>
      ) : null}
      <ScrollView style={{ maxHeight: expanded ? 380 : undefined }} contentContainerStyle={{ gap: 10 }}>
        {queue.corrections.slice(0, expanded ? undefined : 1).map((c) => (
          <View key={c.id} style={{ gap: 2 }}>
            <HRow gap={10} style={[styles.modHead, { backgroundColor: colors.sunken }]}>
              {c.teacher ? <Avatar initials={c.teacher.initials} seed={c.teacher.name} size="sm" /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {c.teacher?.name} · {c.subject} {c.class}
                </Text>
                <Text variant="xs" color="muted" numberOfLines={1}>
                  {t('console.academics.exams.sent', { date: shortDate(c.sent_at.slice(0, 10)), time: formatTime(c.sent_at) })}
                  {c.published_on ? ` · ${t('console.academics.exams.publishedOn', { date: shortDate(c.published_on) })}` : ''}
                </Text>
              </View>
            </HRow>
            {c.entries.map((e, i) => {
              const delta = e.to - e.from;
              return (
                <View
                  key={e.index}
                  style={[styles.modRow, { borderBottomColor: colors.line, borderBottomWidth: i === c.entries.length - 1 ? 0 : 1 }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="sm" weight={700} numberOfLines={1}>
                      {e.student}{' '}
                      <Text variant="xs" color="muted" weight={600}>
                        {e.roll_no != null ? `· ${t('console.academics.exams.roll', { roll: e.roll_no })}` : ''}
                      </Text>
                    </Text>
                    <Text variant="xs" color="muted" numberOfLines={1}>
                      {e.note}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <HRow gap={5}>
                      <Text variant="sm" color="muted" num style={{ textDecorationLine: 'line-through' }}>
                        {e.from}
                      </Text>
                      <Icon name="arrowRight" size={12} rawColor={colors.muted} />
                      <Text variant="sm" weight={800} num>
                        {e.to}
                      </Text>
                    </HRow>
                    <Text rawColor={delta >= 0 ? colors.ok : colors.bad} style={{ fontFamily: fonts.bold, fontSize: 11 }} num>
                      {t('console.academics.exams.marks', { sign: delta >= 0 ? '+' : '−', count: Math.abs(delta) })}
                    </Text>
                  </View>
                  {e.decision ? (
                    <Pill
                      tone={e.decision === 'accept' ? 'ok' : 'bad'}
                      dot={false}
                      label={t(e.decision === 'accept' ? 'console.academics.exams.accept' : 'console.academics.exams.reject')}
                    />
                  ) : (
                    <HRow gap={6}>
                      <IconButton
                        icon="check"
                        size="sm"
                        variant="ok"
                        label={t('console.academics.exams.approveFor', { name: e.student })}
                        onPress={() => decide.mutate({ id: c.id, index: e.index, decision: 'accept' }, { onError })}
                      />
                      <IconButton
                        icon="close"
                        size="sm"
                        variant="bad"
                        label={t('console.academics.exams.rejectFor', { name: e.student })}
                        onPress={() => decide.mutate({ id: c.id, index: e.index, decision: 'reject' }, { onError })}
                      />
                    </HRow>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        {(expanded || !queue.corrections.length ? queue.sheets : []).map((s) => (
          <HRow key={s.id} gap={10} style={[styles.modRow, { borderTopColor: colors.line, borderTopWidth: 1 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700}>
                {s.subject} {s.class}
              </Text>
              <Text variant="xs" color="muted">
                {s.note || t('console.academics.exams.heldForCheck')}
              </Text>
            </View>
            <Button
              title={t('console.academics.exams.markModerated')}
              size="sm"
              variant="secondary"
              loading={moderate.isPending}
              onPress={() => moderate.mutate(s.id, { onError })}
            />
          </HRow>
        ))}
      </ScrollView>
      {more ? (
        <HRow gap={8} style={[styles.more, { borderTopColor: colors.line }]}>
          <Text variant="xs" color="muted" style={{ flex: 1 }}>
            {[
              queue.corrections.length > 1 ? t('console.academics.exams.moreCorrections', { count: queue.corrections.length - 1 }) : null,
              queue.sheets.length ? t('console.academics.exams.d_sheets', { count: queue.sheets.length }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Link label={t('console.academics.exams.showQueue')} icon="chevronDown" onPress={() => setExpanded(true)} />
        </HRow>
      ) : null}
      <View style={{ gap: 10, marginTop: 'auto' }}>
        <HRow gap={6}>
          <Icon name="shield" size={14} rawColor={colors.muted} />
          <Text variant="xs" color="muted" style={{ flex: 1 }}>
            {t('console.academics.exams.audited')}
          </Text>
        </HRow>
        <HRow gap={8}>
          <Button
            title={t('console.academics.exams.approveAll', { count: entries })}
            variant="ok"
            size="sm"
            icon="check"
            disabled={!entries}
            loading={approveAll.isPending}
            onPress={() => approveAll.mutate(undefined, { onError })}
          />
          <Button
            title={t('console.academics.exams.scripts')}
            variant="ghost"
            size="sm"
            icon="document"
            disabled
            accessibilityHint={t('console.academics.exams.scriptsHint')}
          />
        </HRow>
      </View>
    </Panel>
  );
}

// ------------------------------------------------------------------ the drop

function TrendCard({ trend }: { trend: Trend }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const gradeLabel = useGradeLabel();
  const subjectLabel = useSubjectLabel();
  const [message, setMessage] = useState<string | null>(null);
  const subject = subjectLabel(trend.subject.code, trend.subject.name);
  const send = useConsoleMutation(
    (body: string) => academicsApi.messageTeachers({ grade: trend.grade, subject_code: trend.subject.code, body }),
    (r) => {
      setMessage(null);
      toast(t('console.academics.exams.messageSent', { count: r.sent_to }));
    },
  );
  const short = (name: string) => name.replace(/Unit Test (\d+)/, 'UT$1');
  const sections = trend.sections
    .map((s) =>
      t(s.delta < 0 ? 'console.academics.exams.sectionFell' : 'console.academics.exams.sectionRose', {
        label: s.label,
        count: Math.abs(s.delta),
        from: s.from,
        to: s.to,
      }),
    )
    .join(', ');
  const worst = [...trend.sections].sort((a, b) => a.delta - b.delta)[0];
  return (
    <Panel gap={12} style={{ flex: 1 }}>
      <CardHead
        icon={undefined}
        title={
          <HRow gap={12}>
            <TileIcon icon="trendDown" tone="bad" size="sm" />
            <View style={{ flexShrink: 1 }}>
              <Text variant="h3" accessibilityRole="header">
                {t('console.academics.exams.trendTitle', { grade: gradeLabel(trend.grade), subject, count: Math.abs(trend.delta) })}
              </Text>
              <Text variant="xs" color="muted">
                {t('console.academics.exams.trendSub', {
                  from: trend.exams[trend.exams.length - 2],
                  to: short(trend.exams[trend.exams.length - 1]).replace('UT', ''),
                })}
              </Text>
            </View>
          </HRow>
        }
      />
      <HRow gap={16}>
        <LegendEntry
          swatch={<Sw color={colors.c1} />}
          label={t('console.academics.exams.gradeSeries', { grade: gradeLabel(trend.grade), subject })}
        />
        <LegendEntry swatch={<Sw color={colors.c2} />} label={t('console.academics.exams.schoolSeries', { subject })} />
      </HRow>
      <SlopeChart trend={trend} gradeName={gradeLabel(trend.grade)} />
      <Text variant="sm" color="ink2">
        {sections ? `${sections}. ` : ''}
        {trend.syllabus.percent != null && trend.syllabus.planned != null ? t('console.academics.exams.trendSyllabus', trend.syllabus) : ''}
      </Text>
      <HRow gap={12} style={{ marginTop: 'auto', flexWrap: 'wrap' }}>
        <Button
          title={t('console.academics.exams.remedial')}
          variant="secondary"
          size="sm"
          icon="book"
          onPress={() => router.navigate(worst ? { pathname: '/console/timetable', params: { class: worst.id } } : '/console/timetable')}
        />
        <Link
          label={t('console.academics.exams.messageDept', { subject })}
          onPress={() =>
            setMessage(
              t('console.academics.exams.messageDraft', {
                grade: gradeLabel(trend.grade),
                subject: trend.subject.name.toLowerCase(),
                count: Math.abs(trend.delta),
              }),
            )
          }
        />
      </HRow>
      <Sheet
        visible={message != null}
        onClose={() => setMessage(null)}
        title={t('console.academics.exams.messageTitle', { grade: gradeLabel(trend.grade), subject: trend.subject.name })}>
        <TextField
          label={t('console.academics.exams.messageLabel')}
          value={message ?? ''}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />
        <Button
          title={t('console.academics.exams.send')}
          icon="send"
          loading={send.isPending}
          disabled={!message?.trim()}
          onPress={() => send.mutate(message ?? '', { onError: (e) => toast((e as Error).message, 'danger') })}
        />
      </Sheet>
    </Panel>
  );
}

function SlopeChart({ trend, gradeName }: { trend: Trend; gradeName: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const h = 196;
  const pairs: { key: string; color: string; points: (number | null)[]; label: string }[] = [
    { key: 'grade', color: colors.c1, points: trend.grade_points, label: gradeName },
    { key: 'school', color: colors.c2, points: trend.school_points, label: t('console.academics.exams.school') },
  ];
  const values = pairs.flatMap((p) => p.points.filter((v): v is number => v != null));
  const lo = Math.floor((Math.min(...values) - 6) / 10) * 10;
  const hi = Math.ceil((Math.max(...values) + 6) / 10) * 10;
  const top = 8;
  const bottom = 174;
  const y = (v: number) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top - 20) - 10;
  const n = trend.exams.length;
  const x0 = 70;
  const x1 = Math.max(x0 + 40, width - 107);
  const x = (i: number) => (n <= 1 ? x0 : x0 + (i / (n - 1)) * (x1 - x0));
  // Keep the start and end labels of the two lines from overlapping.
  const spread = (a: number, b: number, min: number): [number, number] => {
    const d = Math.abs(a - b);
    if (d >= min) return [a, b];
    const push = (min - d) / 2;
    return a <= b ? [a - push, b + push] : [a + push, b - push];
  };
  const ends = (idx: 0 | 1) =>
    pairs.map((p) => {
      const vals = p.points.map((v, i) => (v == null ? null : ([i, v] as const))).filter((q): q is readonly [number, number] => !!q);
      const q = idx === 0 ? vals[0] : vals[vals.length - 1];
      return q ? y(q[1]) : 0;
    });
  const [s0a, s0b] = spread(ends(0)[0], ends(0)[1], 13);
  const [s1a, s1b] = spread(ends(1)[0], ends(1)[1], 30);
  const labelY = { start: [s0a, s0b], end: [s1a, s1b] };
  const summary = pairs
    .map((p) => `${p.label}: ${p.points.map((v, i) => `${trend.exams[i]} ${v != null ? Math.round(v) : '—'}`).join(', ')}`)
    .join('; ');
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      style={{ height: h }}>
      {width > 0 ? (
        <Svg width={width} height={h}>
          {[0, 1, 2].map((k) => {
            const gy = bottom - k * 64;
            return <Line key={k} x1={44} y1={gy} x2={x1 + 20} y2={gy} stroke={colors.line} strokeWidth={1} />;
          })}
          {trend.exams.map((_, i) => (
            <Line key={`c${i}`} x1={x(i)} y1={top} x2={x(i)} y2={bottom} stroke={colors.lineStrong} strokeWidth={1} />
          ))}
          {pairs.map((p, pi) => {
            const pts = p.points.map((v, i) => (v == null ? null : ([x(i), y(v)] as const)));
            const real = pts.filter((q): q is readonly [number, number] => !!q);
            const first = p.points.find((v) => v != null);
            const last = [...p.points].reverse().find((v) => v != null);
            const lastPt = real[real.length - 1];
            const firstPt = real[0];
            const delta = first != null && last != null ? Math.round(last) - Math.round(first) : 0;
            return (
              <G key={p.key}>
                {real.slice(1).map((q, i) => (
                  <Line
                    key={i}
                    x1={real[i][0]}
                    y1={real[i][1]}
                    x2={q[0]}
                    y2={q[1]}
                    stroke={p.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ))}
                {real.map((q, i) => (
                  <Circle key={`p${i}`} cx={q[0]} cy={q[1]} r={5} fill={p.color} stroke={colors.surface} strokeWidth={2} />
                ))}
                {firstPt && first != null ? (
                  <SvgText
                    x={firstPt[0] - 12}
                    y={labelY.start[pi] + 4}
                    fill={colors.muted}
                    fontSize={11}
                    fontFamily={fonts.semibold}
                    textAnchor="end">
                    {Math.round(first)}
                  </SvgText>
                ) : null}
                {lastPt && last != null ? (
                  <>
                    <SvgText x={lastPt[0] + 12} y={labelY.end[pi] - 2} fill={colors.ink} fontSize={11.5} fontFamily={fonts.bold}>
                      {p.label}
                    </SvgText>
                    <SvgText x={lastPt[0] + 12} y={labelY.end[pi] + 12} fill={colors.muted} fontSize={11} fontFamily={fonts.semibold}>
                      {`${Math.round(last)} · ${delta >= 0 ? '+' : '−'}${Math.abs(delta)}`}
                    </SvgText>
                  </>
                ) : null}
              </G>
            );
          })}
          {trend.exams.map((name, i) => (
            <SvgText key={`x${i}`} x={x(i)} y={190} fill={colors.muted} fontSize={11} fontFamily={fonts.medium} textAnchor="middle">
              {name}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ the next exam

function UpcomingCard({ up }: { up: Upcoming }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const gradeLabel = useGradeLabel();
  const subjectLabel = useSubjectLabel();
  const [all, setAll] = useState(false);
  const assign = useConsoleMutation(academicsApi.assignInvigilators, (r) =>
    toast(t('console.academics.exams.invigilatorsAdded', { count: r.added, teachers: r.teachers })),
  );
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        const session = useSession.getState();
        const res = await fetch(`${API_URL}/console/exams/datesheet`, {
          headers: { Authorization: `Bearer ${session.access}`, 'X-School-Id': session.schoolId ?? '' },
        });
        if (!res.ok) throw new Error(t('console.academics.exams.downloadFailed'));
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${up.name.toLowerCase().replace(/\s+/g, '-')}-datesheet.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await request('/console/exams/datesheet');
      }
    } catch (e) {
      toast((e as Error).message, 'danger');
    } finally {
      setDownloading(false);
    }
  };
  const rows = all ? up.rows : up.rows.slice(0, 8);
  const first = dayLabel(up.first);
  const last = dayLabel(up.last);
  const range =
    first.split(' ').slice(-1)[0] === last.split(' ').slice(-1)[0]
      ? `${first.split(' ').slice(0, 2).join(' ')} – ${last}`
      : `${first} – ${last}`;
  const columns: Column<Upcoming['rows'][number]>[] = [
    {
      key: 'date',
      title: t('console.academics.exams.date'),
      flex: 1,
      render: (r) => (
        <Text variant="sm" weight={700} num style={{ fontSize: 13.5 }}>
          {dayLabel(r.date)}
        </Text>
      ),
    },
    {
      key: 'grades',
      title: t('console.academics.exams.grades'),
      flex: 1,
      render: (r) => (
        <Text variant="sm" color="ink2" style={{ fontSize: 13.5 }}>
          {t('console.academics.common.grades', { range: r.grades })}
        </Text>
      ),
    },
    {
      key: 'paper',
      title: t('console.academics.exams.paper'),
      flex: 1.6,
      render: (r) => (
        <Text variant="sm" weight={600} style={{ fontSize: 13.5 }}>
          {r.subject.name}
        </Text>
      ),
    },
    {
      key: 'time',
      title: t('console.academics.exams.time'),
      flex: 1,
      render: (r) => <Text variant="sm" color="ink2" num style={{ fontSize: 13.5 }}>{`${to12(r.starts_at)}–${to12(r.ends_at)}`}</Text>,
    },
    { key: 'rooms', title: t('console.academics.exams.rooms'), width: 88, align: 'right', render: (r) => String(r.rooms) },
    {
      key: 'inv',
      title: t('console.academics.exams.invigilators'),
      flex: 1.5,
      render: (r) => (
        <HRow gap={10}>
          <Bar value={r.assigned} max={r.needed || 1} size="thin" tone={r.status === 'complete' ? 'ok' : 'brand'} style={{ width: 90 }} />
          <Text variant="sm" weight={600} num style={{ fontSize: 13.5 }}>
            {r.assigned} / {r.needed}
          </Text>
        </HRow>
      ),
    },
    {
      key: 'status',
      title: t('console.academics.exams.status'),
      flex: 1,
      render: (r) => (
        <Pill
          tone={r.status === 'complete' ? 'ok' : r.status === 'short' ? 'warn' : 'bad'}
          label={
            r.status === 'complete'
              ? t('console.academics.exams.inv_complete')
              : r.status === 'short'
                ? t('console.academics.exams.inv_short', { count: r.needed - r.assigned })
                : t('console.academics.exams.inv_none')
          }
        />
      ),
    },
  ];
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <CardHead
        style={{ paddingTop: 20, paddingHorizontal: 22, paddingBottom: 16 }}
        title={t('console.academics.exams.upTitle', { name: up.name })}
        subtitle={[
          range,
          t('console.academics.common.grades', { range: up.grades }),
          up.in_class.length ? t('console.academics.exams.inClass', { grades: up.in_class.join(', ') }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        right={
          <>
            <Button
              title={t('console.academics.exams.datesheet')}
              variant="secondary"
              size="sm"
              icon="download"
              loading={downloading}
              onPress={() => void download()}
            />
            <Button
              title={t('console.academics.exams.assignInvigilators')}
              variant="secondary"
              size="sm"
              icon="users"
              loading={assign.isPending}
              disabled={up.rows.every((r) => r.status === 'complete')}
              onPress={() => assign.mutate(undefined, { onError: (e) => toast((e as Error).message, 'danger') })}
            />
          </>
        }
      />
      <View style={styles.strip} accessibilityLabel={t('console.academics.exams.examDays')}>
        {up.strip.map((d) => {
          const on = d.subjects.length > 0;
          const label = on
            ? d.subjects.length > 1
              ? `${subjectLabel(d.subjects[0])} +${d.subjects.length - 1}`
              : subjectLabel(d.subjects[0])
            : t('console.academics.exams.studyLeave');
          return (
            <View
              key={d.date}
              style={[
                styles.day,
                on
                  ? { backgroundColor: colors.brandSoft, borderColor: colors.brandLine }
                  : { backgroundColor: colors.sunken, borderColor: 'transparent' },
              ]}
              accessible
              accessibilityLabel={`${dayLabel(d.date)}, ${label}`}>
              <Text variant="xxs" weight={700} color="muted" style={{ letterSpacing: 0.88, textTransform: 'uppercase' }}>
                {weekdayShort(d.date)}
              </Text>
              <Text variant="h3" num color={on ? 'ink' : 'muted'}>
                {shortDate(d.date)}
              </Text>
              <Text variant="xs" weight={on ? 700 : 500} color={on ? 'brandInk' : 'muted'} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} rowHeight={51} />
      <View style={[styles.foot, { borderTopColor: colors.line }]}>
        <Text variant="sm" color="muted">
          {t('console.academics.exams.showing', { shown: rows.length, total: up.rows.length, per: up.per_room, count: up.per_room })}
        </Text>
        {up.rows.length > 8 ? (
          <Link
            label={all ? t('console.academics.exams.showFewer') : t('console.academics.exams.showAll')}
            icon={all ? 'chevronUp' : 'chevronDown'}
            onPress={() => setAll(!all)}
          />
        ) : null}
      </View>
    </Card>
  );
}

function to12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11 },
  modHead: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  modRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  strip: { flexDirection: 'row', gap: 8, paddingHorizontal: 22, paddingBottom: 18 },
  day: { flex: 1, minWidth: 0, borderRadius: 14, padding: 10, gap: 2, borderWidth: 1 },
  more: { paddingTop: 10, borderTopWidth: 1 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: 999 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderTopWidth: 1,
  },
});
