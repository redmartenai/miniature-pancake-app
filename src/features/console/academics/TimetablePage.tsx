import { useLocalSearchParams } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { addDays, isoDate, parseDate } from '@/lib/format';
import { CardHead, Col, ConsolePage, Panel, Row } from '@/features/console/Page';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  Pill,
  pointer,
  SegmentedControl,
  Sheet,
  Text,
  TileIcon,
  useToast,
  Vr,
} from '@/ui';

import {
  academicsApi,
  useConsoleMutation,
  useCover,
  useTimetable,
  type CoverData,
  type CoverItem,
  type DraftClash,
  type FreeSlots,
  type TimetableCell,
  type TimetableData,
  type TimetableView,
} from './api';
import { clock12, dayLabel, HRow, LegendEntry, MiniPill, PickerSheet, shortDate, subjectTint, Sw, useSubjectLabel } from './parts';

const HEAD_H = 50;
const BAND_H = 28;
const CELL_H = 60;
const GAP = 6;
const LABEL_W = 64;
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function TimetablePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ class?: string }>();
  const [view, setView] = useState<TimetableView>('class');
  const [ids, setIds] = useState<Partial<Record<TimetableView, string>>>(params.class ? { class: params.class } : {});
  const [week, setWeek] = useState<string | undefined>(undefined);
  const query = useTimetable(view, ids[view], week);
  const data = query.data;
  const publish = useConsoleMutation(academicsApi.publishTimetable, (r) =>
    toast(
      r.held
        ? t('console.academics.timetable.publishedHeld', { count: r.applied, held: r.held })
        : t('console.academics.timetable.published', { count: r.applied }),
    ),
  );
  const draft = data?.draft;
  const subtitle = data
    ? [
        data.term
          ? draft?.live_since
            ? t('console.academics.timetable.liveSince', { term: data.term.name, date: shortDate(draft.live_since) })
            : t('console.academics.timetable.live', { term: data.term.name })
          : null,
        draft?.periods ? t('console.academics.timetable.edited', { count: draft.periods }) : t('console.academics.timetable.noDraft'),
        draft?.clashes.length ? t('console.academics.timetable.clashes', { count: draft.clashes.length }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  return (
    <ConsolePage
      title={t('console.academics.timetable.title')}
      crumbs={[{ label: t('console.shell.nav.academics'), href: '/console/academics' }]}
      subtitle={subtitle}
      loading={query.isLoading && !data}
      error={query.error}
      onRetry={() => void query.refetch()}
      actions={
        <>
          <Button
            title={t('console.academics.timetable.print')}
            variant="secondary"
            icon="print"
            onPress={() => (Platform.OS === 'web' ? window.print() : undefined)}
          />
          <Button
            title={t('console.academics.timetable.publish')}
            icon="upload"
            disabled={!draft?.publishable}
            loading={publish.isPending}
            accessibilityHint={!draft?.publishable ? t('console.academics.timetable.publishDisabled') : undefined}
            onPress={() => publish.mutate(undefined, { onError: (e) => toast((e as Error).message, 'danger') })}
          />
        </>
      }>
      {data ? (
        <Row align="flex-start">
          <Col span={8} style={{ alignSelf: 'stretch' }}>
            <WeekCard
              data={data}
              view={view}
              onView={setView}
              onTarget={(id) => setIds((cur) => ({ ...cur, [view]: id }))}
              onWeek={(delta) => setWeek(isoDate(addDays(parseDate(data.week.start), delta * 7)))}
              fetching={query.isFetching}
            />
          </Col>
          <Col span={4} gap={20}>
            <CoverCard />
            {data.draft.clashes.length ? <ClashCard clash={data.draft.clashes[0]} draft={data.draft} subjects={data.subjects} /> : null}
          </Col>
        </Row>
      ) : null}
    </ConsolePage>
  );
}

// ------------------------------------------------------------------ the week

function WeekCard({
  data,
  view,
  onView,
  onTarget,
  onWeek,
  fetching,
}: {
  data: TimetableData;
  view: TimetableView;
  onView: (v: TimetableView) => void;
  onTarget: (id: string) => void;
  onWeek: (delta: number) => void;
  fetching: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<{ weekday: number; period: number } | null>(null);
  const start = parseDate(data.week.start);
  const end = parseDate(data.week.end);
  const range = `${start.getDate()}–${shortDate(data.week.end)} ${end.getFullYear()}`;
  const options = view === 'class' ? data.options.classes : view === 'teacher' ? data.options.teachers : data.options.rooms;
  const label = view === 'class' ? t('console.academics.timetable.classLabel', { label: data.target.label }) : data.target.label;
  const meta = data.meta;
  const satPeriods = data.week.days.find((d) => d.weekday === 5)?.periods.length ?? 0;
  const maxPeriods = Math.max(...data.week.days.map((d) => d.periods.length));
  const metaLine =
    view === 'class'
      ? [
          meta.class_teacher ? t('console.academics.timetable.classTeacher', { name: meta.class_teacher.name }) : null,
          meta.room,
          meta.students != null ? t('console.academics.timetable.students', { count: meta.students }) : null,
          t('console.academics.timetable.periodsWeek', { count: meta.periods }),
          satPeriods && satPeriods < maxPeriods ? t('console.academics.timetable.halfDay') : null,
        ]
      : view === 'teacher'
        ? [t('console.academics.timetable.periodsWeek', { count: meta.periods }), meta.subjects?.join(', ')]
        : [t('console.academics.timetable.roomUse', { count: meta.periods })];

  return (
    <Panel gap={16} style={{ flex: 1 }}>
      <CardHead
        title={
          <HRow gap={12}>
            <Chip
              label={label}
              selected
              icon={view === 'class' ? 'layers' : view === 'teacher' ? 'user' : 'pin'}
              onPress={() => setPicker(true)}
              accessibilityLabel={t('console.academics.timetable.change', { label })}
            />
            <HRow gap={4}>
              <IconButton icon="chevronLeft" size="sm" label={t('console.academics.timetable.prevWeek')} onPress={() => onWeek(-1)} />
              <Text variant="sm" weight={700} num style={{ paddingHorizontal: 6, opacity: fetching ? 0.6 : 1 }}>
                {range}
              </Text>
              <IconButton icon="chevronRight" size="sm" label={t('console.academics.timetable.nextWeek')} onPress={() => onWeek(1)} />
            </HRow>
          </HRow>
        }
        right={
          <SegmentedControl
            full={false}
            value={view}
            onChange={onView}
            options={[
              { value: 'class', label: t('console.academics.timetable.byClass') },
              { value: 'teacher', label: t('console.academics.timetable.byTeacher') },
              { value: 'room', label: t('console.academics.timetable.byRoom') },
            ]}
          />
        }
      />
      <Text variant="xs" color="muted" style={{ marginTop: -6 }}>
        {metaLine.filter(Boolean).join(' · ')}
      </Text>
      <Grid data={data} view={view} onEdit={view === 'class' ? setEditing : undefined} />
      <View style={styles.legend}>
        {[
          ['MATH', 'MATH'],
          ['ENG', 'ENG'],
          ['SCI', 'SCI'],
          ['HIN', 'HIN'],
          ['SST', 'SST'],
          ['CS', 'CS'],
          ['ART', 'activities'],
        ].map(([code, key]) => {
          const tint = subjectTint(colors, code);
          return (
            <LegendEntry
              key={key}
              swatch={<Sw color={tint.bg} border={tint.border} />}
              label={key === 'activities' ? t('console.academics.timetable.activities') : t(`console.academics.subjects.${code}`)}
            />
          );
        })}
        <Vr style={{ height: 14, alignSelf: 'center' }} />
        <LegendEntry
          swatch={<MiniPill label={t('console.academics.timetable.sub')} tone="info" />}
          label={t('console.academics.timetable.substitute')}
        />
        <LegendEntry
          swatch={<View style={[styles.dot, { backgroundColor: colors.info, position: 'relative', top: 0, right: 0 }]} />}
          label={t('console.academics.timetable.unpublished')}
        />
        <LegendEntry
          swatch={<View style={{ width: 10, height: 10, borderRadius: 3, boxShadow: `inset 0 0 0 1.5px ${colors.bad}` }} />}
          label={t('console.academics.timetable.clash')}
        />
      </View>
      <PickerSheet
        visible={picker}
        onClose={() => setPicker(false)}
        title={t(`console.academics.timetable.pick_${view}`)}
        options={options}
        value={data.target.id}
        onPick={onTarget}
      />
      {editing ? <EditSheet data={data} at={editing} onClose={() => setEditing(null)} /> : null}
    </Panel>
  );
}

function Grid({
  data,
  view,
  onEdit,
}: {
  data: TimetableData;
  view: TimetableView;
  onEdit?: (at: { weekday: number; period: number }) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const cells = useMemo(() => {
    const m = new Map<string, TimetableCell>();
    data.cells.forEach((c) => m.set(`${c.weekday}:${c.period}`, c));
    return m;
  }, [data.cells]);
  const rows = [
    ...(data.bells.assembly
      ? [{ kind: 'assembly' as const, starts_at: data.bells.assembly.starts_at, ends_at: data.bells.assembly.ends_at }]
      : []),
    ...data.bells.rows,
  ];
  const heights = rows.map((r) => (r.kind === 'period' ? CELL_H : BAND_H));
  const tops = heights.map((_, i) => HEAD_H + GAP + heights.slice(0, i).reduce((a, h) => a + h + GAP, 0));
  const total = tops.length ? tops[tops.length - 1] + heights[heights.length - 1] : HEAD_H;
  const colW = width ? (width - LABEL_W - GAP * 6) / 6 : 0;
  const colLeft = (i: number) => LABEL_W + GAP + i * (colW + GAP);
  const lastPeriodRow = (weekday: number) => {
    const periods = data.week.days.find((d) => d.weekday === weekday)?.periods ?? [];
    const last = periods[periods.length - 1];
    return rows.findIndex((r) => r.kind === 'period' && r.period === last);
  };

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: total, position: 'relative' }}
      accessibilityRole={'table' as never}
      accessibilityLabel={t('console.academics.timetable.a11y', {
        label: data.target.label,
        from: shortDate(data.week.start),
        to: shortDate(data.week.end),
      })}>
      {width > 0 ? (
        <>
          {/* Row labels */}
          {rows.map((r, i) => (
            <View key={`l${i}`} style={[styles.rowLabel, { top: tops[i], height: heights[i], width: LABEL_W }]}>
              {r.kind === 'period' ? (
                <>
                  <Text variant="sm" weight={700}>
                    P{r.period}
                  </Text>
                  <Text variant="xxs" color="muted" num>
                    {clock12(r.starts_at)}
                  </Text>
                </>
              ) : (
                <HRow gap={6} style={{ width: 120 }}>
                  <Text variant="xxs" color="muted" weight={700}>
                    {t(`console.academics.timetable.${r.kind}`)}
                  </Text>
                  <Text variant="xxs" color="muted" num>
                    {clock12(r.starts_at)}
                  </Text>
                </HRow>
              )}
            </View>
          ))}
          {/* Day headers */}
          {data.week.days.map((d, i) => (
            <View
              key={d.date}
              style={[styles.dayHead, { left: colLeft(i), width: colW, height: HEAD_H }, d.today && { backgroundColor: colors.ink }]}
              accessibilityRole={'columnheader' as never}>
              <Text rawColor={d.today ? colors.canvas : colors.muted} style={styles.dow}>
                {d.today
                  ? t('console.academics.timetable.todayHead', { day: t(`console.academics.timetable.days.${WEEKDAYS[d.weekday]}`) })
                  : t(`console.academics.timetable.days.${WEEKDAYS[d.weekday]}`)}
              </Text>
              <Text variant="sm" weight={700} num rawColor={d.today ? colors.canvas : colors.ink}>
                {shortDate(d.date)}
              </Text>
            </View>
          ))}
          {/* Bands: assembly, break and lunch (they stop at a half day's end) */}
          {rows.map((r, i) => {
            if (r.kind === 'period') return null;
            const through = data.week.days.filter((d) => r.kind === 'assembly' || lastPeriodRow(d.weekday) > i).length;
            const icon = r.kind === 'assembly' ? 'speaker' : r.kind === 'break' ? 'cup' : 'cup';
            return (
              <View
                key={`b${i}`}
                style={[
                  styles.band,
                  {
                    top: tops[i],
                    height: BAND_H,
                    left: colLeft(0),
                    width: through * colW + (through - 1) * GAP,
                    backgroundColor: colors.sunken,
                  },
                ]}>
                <Icon name={icon} size={14} rawColor={colors.muted} />
                <Text variant="xxs" color="muted" weight={700}>
                  {t(`console.academics.timetable.${r.kind}Band`, { from: clock12(r.starts_at), to: clock12(r.ends_at) })}
                </Text>
              </View>
            );
          })}
          {/* Cells */}
          {data.week.days.map((d, di) => {
            const lastRow = lastPeriodRow(d.weekday);
            const out = rows.map((r, ri) => {
              if (r.kind !== 'period' || ri > lastRow) return null;
              const c = cells.get(`${d.weekday}:${r.period}`);
              const now = data.now && d.today && data.now.period === r.period;
              return (
                <Cell
                  key={`${d.date}:${r.period}`}
                  cell={c}
                  view={view}
                  now={!!now}
                  style={{ top: tops[ri], left: colLeft(di), width: colW, height: CELL_H }}
                  onPress={onEdit ? () => onEdit({ weekday: d.weekday, period: r.period }) : undefined}
                  dayName={t(`console.academics.timetable.days.${WEEKDAYS[d.weekday]}`)}
                  period={r.period}
                />
              );
            });
            // A half day: one dashed block from the end of the last period to the bottom.
            if (lastRow >= 0 && lastRow < rows.length - 1) {
              const top = tops[lastRow + 1];
              const bell = rows[lastRow] as { ends_at: string };
              out.push(
                <View
                  key={`half${d.date}`}
                  style={[styles.halfDay, { top, left: colLeft(di), width: colW, height: total - top, borderColor: colors.lineStrong }]}>
                  <Text variant="xs" weight={700} color="ink2">
                    {t('console.academics.timetable.halfDayBlock')}
                  </Text>
                  <Text variant="xxs" color="muted" align="center">
                    {t('console.academics.timetable.dismissal', {
                      time: `${clock12(bell.ends_at)} ${Number(bell.ends_at.slice(0, 2)) >= 12 ? 'PM' : 'AM'}`,
                    })}
                  </Text>
                </View>,
              );
            }
            return <Fragment key={d.date}>{out}</Fragment>;
          })}
          {/* Today's column outline */}
          {data.week.days.map((d, i) =>
            d.today ? (
              <View
                key={`today${d.date}`}
                pointerEvents="none"
                style={[styles.todayRing, { left: colLeft(i) - 4, width: colW + 8, top: -4, height: total + 8, borderColor: colors.brand }]}
              />
            ) : null,
          )}
        </>
      ) : null}
    </View>
  );
}

function Cell({
  cell,
  view,
  now,
  style,
  onPress,
  dayName,
  period,
}: {
  cell: TimetableCell | undefined;
  view: TimetableView;
  now: boolean;
  style: { top: number; left: number; width: number; height: number };
  onPress?: () => void;
  dayName: string;
  period: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const subjectLabel = useSubjectLabel();
  if (!cell || !cell.subject) {
    return (
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={t('console.academics.timetable.freeCell', { day: dayName, period })}
        disabled={!onPress}
        onPress={onPress}
        style={[styles.cell, style, { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line }, onPress && pointer]}>
        <Text variant="xxs" color="faint">
          {cell?.draft ? t('console.academics.timetable.cleared') : t('console.academics.timetable.free')}
        </Text>
        {cell?.draft ? <View style={[styles.dot, { backgroundColor: colors.info }]} /> : null}
      </Pressable>
    );
  }
  const tint = subjectTint(colors, cell.subject.code);
  const clash = cell.clash;
  const title =
    view === 'class'
      ? subjectLabel(cell.subject.code, cell.subject.name)
      : `${cell.class.label} · ${subjectLabel(cell.subject.code, cell.subject.name)}`;
  const who = view === 'room' ? (cell.teacher?.initials ?? '') : view === 'teacher' ? cell.room : (cell.teacher?.initials ?? '—');
  const a11y = [
    dayName,
    `P${period}`,
    cell.subject.name,
    cell.teacher?.name,
    cell.room,
    cell.draft ? t('console.academics.timetable.unpublished') : null,
    clash ? t('console.academics.timetable.clash') : null,
    cell.sub ? t('console.academics.timetable.subFor', { sub: cell.sub.teacher?.name, for: cell.sub.for?.name }) : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11y}
      disabled={!onPress}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.cell,
        style,
        { backgroundColor: tint.bg },
        tint.border ? { borderWidth: 1, borderColor: tint.border } : null,
        clash
          ? { boxShadow: `inset 0 0 0 1.5px ${colors.bad}` }
          : now
            ? { boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.ink}` }
            : null,
        hovered && onPress ? { opacity: 0.85 } : null,
        onPress && pointer,
      ]}>
      {cell.draft ? <View style={[styles.dot, { backgroundColor: colors.info }]} /> : null}
      <HRow gap={4} style={{ justifyContent: 'space-between', minWidth: 0, paddingRight: cell.draft ? 10 : 0 }}>
        <Text variant="xs" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </Text>
        {now ? (
          <MiniPill label={t('console.academics.timetable.now')} tone="ink" />
        ) : cell.sub ? (
          <MiniPill label={t('console.academics.timetable.sub')} tone="info" />
        ) : null}
      </HRow>
      {clash ? (
        <HRow gap={3}>
          <Icon name="alert" size={12} rawColor={colors.bad} bold />
          <Text variant="xxs" weight={700} rawColor={colors.bad} numberOfLines={1}>
            {t('console.academics.timetable.clashWith', { who: clash.kind === 'teacher' ? cell.teacher?.initials : cell.room })}
          </Text>
        </HRow>
      ) : cell.sub && view === 'class' ? (
        <Text variant="xxs" color="ink2" numberOfLines={1}>
          <Text variant="xxs" weight={700} color="ink2">
            {cell.sub.teacher?.initials}
          </Text>{' '}
          {t('console.academics.timetable.forWho', { who: cell.sub.for?.initials })}
        </Text>
      ) : (
        <Text variant="xxs" weight={700} color="ink2" numberOfLines={1}>
          {who}
        </Text>
      )}
    </Pressable>
  );
}

// ------------------------------------------------------------------ editing the draft

function EditSheet({ data, at, onClose }: { data: TimetableData; at: { weekday: number; period: number }; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const subjectLabel = useSubjectLabel();
  const cell = data.cells.find((c) => c.weekday === at.weekday && c.period === at.period);
  const dayName = t(`console.academics.timetable.days.${WEEKDAYS[at.weekday]}`);
  const done = (msg: string) => {
    toast(msg);
    onClose();
  };
  const onError = (e: unknown) => toast((e as Error).message, 'danger');
  const change = useConsoleMutation(academicsApi.draftChange, () => done(t('console.academics.timetable.drafted')));
  const swap = useConsoleMutation(academicsApi.draftSwap, () => done(t('console.academics.timetable.drafted')));
  const undo = useConsoleMutation(academicsApi.undoDraft, () => done(t('console.academics.timetable.undone')));
  const taught = Array.from(new Map(data.cells.filter((c) => c.subject).map((c) => [c.subject!.id, c.subject!])).values());
  const others = data.cells.filter((c) => !(c.weekday === at.weekday && c.period === at.period) && c.subject);
  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('console.academics.timetable.editTitle', { label: data.target.label, day: dayName, period: at.period })}
      message={
        cell?.subject
          ? [subjectLabel(cell.subject.code, cell.subject.name), cell.teacher?.name, cell.room].filter(Boolean).join(' · ') +
            (cell.live
              ? ` — ${t('console.academics.timetable.liveWas', { subject: cell.live.subject ?? t('console.academics.timetable.free') })}`
              : '')
          : t('console.academics.timetable.free')
      }>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 14 }}>
        <Text variant="kicker">{t('console.academics.timetable.changeTo')}</Text>
        <View style={styles.wrap}>
          {taught.map((s) => (
            <Chip
              key={s.id}
              label={subjectLabel(s.code, s.name)}
              selected={cell?.subject?.id === s.id}
              onPress={() =>
                change.mutate({ class_id: data.target.id, weekday: at.weekday, period: at.period, subject_id: s.id }, { onError })
              }
            />
          ))}
          <Chip
            label={t('console.academics.timetable.freePeriod')}
            icon="minus"
            onPress={() =>
              change.mutate({ class_id: data.target.id, weekday: at.weekday, period: at.period, subject_id: null }, { onError })
            }
          />
        </View>
        <Text variant="kicker">{t('console.academics.timetable.swapWith')}</Text>
        <View style={styles.wrap}>
          {others.map((c) => (
            <Chip
              key={`${c.weekday}:${c.period}`}
              label={`${t(`console.academics.timetable.days.${WEEKDAYS[c.weekday]}`)} P${c.period} · ${subjectLabel(c.subject!.code, c.subject!.name)}`}
              onPress={() =>
                swap.mutate(
                  { class_id: data.target.id, weekday: at.weekday, period: at.period, to_weekday: c.weekday, to_period: c.period },
                  { onError },
                )
              }
            />
          ))}
        </View>
        {cell?.draft ? (
          <Button
            title={cell.draft.kind === 'swap' ? t('console.academics.timetable.undoSwap') : t('console.academics.timetable.undoChange')}
            variant="secondary"
            icon="refresh"
            loading={undo.isPending}
            onPress={() => undo.mutate(cell.draft?.batch ?? '', { onError })}
          />
        ) : null}
        <Text variant="xs" color="muted">
          {t('console.academics.timetable.draftNote')}
        </Text>
      </ScrollView>
      <View style={{ height: 1, backgroundColor: colors.line }} />
    </Sheet>
  );
}

function ClashCard({ clash, draft, subjects }: { clash: DraftClash; draft: TimetableData['draft']; subjects: TimetableData['subjects'] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const subjectLabel = useSubjectLabel();
  const [slots, setSlots] = useState<FreeSlots | null>(null);
  const undo = useConsoleMutation(academicsApi.undoDraft, () => toast(t('console.academics.timetable.undone')));
  const move = useConsoleMutation(
    ({ weekday, period }: { weekday: number; period: number }) => academicsApi.moveDraft(clash.batch, weekday, period),
    () => {
      setSlots(null);
      toast(t('console.academics.timetable.moved'));
    },
  );
  const find = useConsoleMutation(() => academicsApi.freeSlots(clash.batch), setSlots);
  const onError = (e: unknown) => toast((e as Error).message, 'danger');
  const others = draft.publishable;
  const who = clash.with.kind === 'teacher' ? (clash.teacher?.name ?? '') : clash.room;
  const dayName = t(`console.academics.timetable.days.${WEEKDAYS[clash.weekday]}`);
  return (
    <Panel gap={12}>
      <HRow gap={12} align="flex-start">
        <TileIcon icon="alert" tone="bad" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700}>
            {t('console.academics.timetable.clashTitle')}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.academics.timetable.clashWhen', {
              date: dayLabel(clash.date),
              period: clash.period,
              time: `${clock12(clash.starts_at)} ${Number(clash.starts_at.slice(0, 2)) >= 12 ? 'PM' : 'AM'}`,
            })}
          </Text>
        </View>
        <Pill tone="warn" dot={false} label={t('console.academics.timetable.heldBack')} />
      </HRow>
      <Text variant="sm" color="ink2">
        {t(clash.kind === 'swap' ? 'console.academics.timetable.clashSwap' : 'console.academics.timetable.clashChange', {
          subject: subjectLabel(clash.code ?? '', clash.subject ?? ''),
          period: clash.period,
          day: dayName,
        })}{' '}
        <Text variant="sm" weight={700} color="ink">
          {who}
        </Text>
        {clash.with.kind === 'teacher'
          ? t('console.academics.timetable.clashTeacher', {
              class: clash.with.class,
              subject: subjectLabel(subjects.find((x) => x.name === clash.with.subject)?.code ?? '', clash.with.subject ?? ''),
            })
          : t('console.academics.timetable.clashRoom', { class: clash.with.class })}{' '}
        {others ? t('console.academics.timetable.clashOthers', { count: others }) : t('console.academics.timetable.clashHold')}
      </Text>
      <HRow gap={8}>
        <Button
          title={clash.kind === 'swap' ? t('console.academics.timetable.undoSwap') : t('console.academics.timetable.undoChange')}
          variant="secondary"
          size="sm"
          loading={undo.isPending}
          onPress={() => undo.mutate(clash.batch, { onError })}
        />
        {clash.kind === 'swap' ? (
          <Button
            title={t('console.academics.timetable.findSlot')}
            variant="ghost"
            size="sm"
            icon="search"
            loading={find.isPending}
            onPress={() => find.mutate(undefined, { onError })}
          />
        ) : null}
      </HRow>
      <Sheet
        visible={!!slots}
        onClose={() => setSlots(null)}
        title={t('console.academics.timetable.freeTitle', { subject: slots?.subject ?? '' })}
        message={slots?.items.length ? t('console.academics.timetable.freeHint') : undefined}>
        {slots?.items.length ? (
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 8 }}>
            {slots.items.map((s) => (
              <Pressable
                key={`${s.weekday}:${s.period}`}
                accessibilityRole="button"
                onPress={() => move.mutate({ weekday: s.weekday, period: s.period }, { onError })}
                style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.slotRow,
                  pointer,
                  { borderColor: colors.line, backgroundColor: hovered ? colors.subtle : colors.surface },
                ]}>
                <Text variant="sm" weight={700} style={{ width: 90 }}>
                  {t(`console.academics.timetable.days.${WEEKDAYS[s.weekday]}`)} P{s.period}
                </Text>
                <Text variant="xs" color="muted" style={{ flex: 1 }}>
                  {t('console.academics.timetable.swapsWith', { subject: s.subject, teacher: s.teacher?.name ?? '—' })}
                </Text>
                <Icon name="chevronRight" size={14} rawColor={colors.muted} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon="calendarX"
            title={t('console.academics.timetable.noFreeSlot')}
            message={t('console.academics.timetable.noFreeSlotHint')}
          />
        )}
      </Sheet>
    </Panel>
  );
}

// ------------------------------------------------------------------ substitutions today

function CoverCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const query = useCover();
  const data = query.data;
  const all = useConsoleMutation(
    () => academicsApi.assignCover({ all: true }),
    () => toast(t('console.academics.cover.allDone')),
  );
  if (!data)
    return (
      <Panel>
        {query.error ? (
          <Text variant="sm" color="bad">
            {(query.error as Error).message}
          </Text>
        ) : (
          <Text variant="sm" color="muted">
            …
          </Text>
        )}
      </Panel>
    );
  const leave = data.on_leave.map((l) => l.name);
  const names =
    leave.length > 1
      ? t('console.academics.homework.andList', { first: leave.slice(0, -1).join(', '), last: leave[leave.length - 1] })
      : leave[0];
  return (
    <Panel gap={12}>
      <CardHead
        title={t('console.academics.cover.title')}
        subtitle={`${dayLabel(data.date)} · ${data.day_over ? t('console.academics.cover.dayOver') : t('console.academics.cover.remaining')}`}
        right={
          data.open ? (
            <Pill tone="bad" label={t('console.academics.cover.uncovered', { count: data.open })} />
          ) : data.day_over ? (
            <Pill tone="neutral" label={t('console.academics.cover.dayOverPill')} />
          ) : (
            <Pill tone="ok" label={t('console.academics.cover.allCovered')} />
          )
        }
      />
      {data.on_leave.length ? (
        <HRow gap={10} style={[styles.leave, { backgroundColor: colors.sunken }]}>
          <View style={{ flexDirection: 'row' }}>
            {data.on_leave.slice(0, 4).map((p, i) => (
              <Avatar
                key={p.name}
                initials={p.initials}
                seed={p.name}
                size="xs"
                ring={{ color: colors.sunken, width: 2 }}
                style={{ marginLeft: i ? -5 : 0 }}
              />
            ))}
          </View>
          <Text variant="xs" color="ink2" style={{ flex: 1 }}>
            {t('console.academics.cover.onLeave', { count: leave.length, names })}
          </Text>
        </HRow>
      ) : (
        <Text variant="sm" color="muted">
          {t('console.academics.cover.nobody')}
        </Text>
      )}
      <View>
        {data.items.map((item, i) => (
          <CoverRow key={item.slot_id} item={item} last={i === data.items.length - 1} />
        ))}
      </View>
      {data.items.length && !data.day_over ? (
        <Button
          title={t('console.academics.cover.assignAll', { count: data.suggestions })}
          variant="secondary"
          size="sm"
          icon="check"
          fullWidth
          disabled={!data.suggestions}
          loading={all.isPending}
          onPress={() => all.mutate(undefined, { onError: (e) => toast((e as Error).message, 'danger') })}
        />
      ) : null}
    </Panel>
  );
}

function CoverRow({ item, last }: { item: CoverItem; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const subjectLabel = useSubjectLabel();
  const assign = useConsoleMutation(
    () => academicsApi.assignCover({ slot_id: item.slot_id, teacher_id: item.suggestion?.id ?? '' }),
    (_r: CoverData) => toast(t('console.academics.cover.assigned', { name: item.suggestion?.name, class: item.class })),
  );
  const subject = subjectLabel(item.code, item.subject);
  const done = item.state === 'done';
  return (
    <View style={[styles.coverRow, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <HRow gap={8}>
          <Text variant="sm" weight={700}>
            {item.class} · {subject}
          </Text>
          <Text variant="xs" color="muted" num>
            P{item.period} · {clock12(item.starts_at)}
          </Text>
          {item.state === 'now' ? (
            <MiniPill label={t('console.academics.cover.now')} tone="bad" height={20} />
          ) : item.state === 'todo' ? (
            <MiniPill
              label={
                item.minutes != null && item.minutes < 60
                  ? t('console.academics.cover.inMin', { count: item.minutes })
                  : t('console.academics.cover.later')
              }
              tone="warn"
              height={20}
            />
          ) : (
            <MiniPill label={t('console.academics.cover.over')} tone="neutral" height={20} />
          )}
        </HRow>
        <HRow gap={6}>
          <Text variant="xs" color="muted">
            {t('console.academics.timetable.forWho', { who: item.for.initials })}
          </Text>
          {item.suggestion ? (
            <>
              <Icon name="arrowRight" size={12} rawColor={colors.muted} />
              <Avatar initials={item.suggestion.initials} seed={item.suggestion.name} size="xs" />
              <Text variant="xs" weight={600} color="ink2">
                {item.suggestion.name}
              </Text>
              <Text variant="xs" color="muted">
                · {t('console.academics.cover.free')}
              </Text>
            </>
          ) : (
            <Text variant="xs" color="muted">
              · {done ? t('console.academics.cover.notCovered') : t('console.academics.cover.noneFree')}
            </Text>
          )}
        </HRow>
      </View>
      {item.suggestion && !done ? (
        <Button
          title={t('console.academics.cover.assign')}
          variant="secondary"
          size="sm"
          loading={assign.isPending}
          accessibilityLabel={t('console.academics.cover.assignLabel', { name: item.suggestion.name, class: item.class, subject })}
          onPress={() => assign.mutate(undefined, { onError: (e) => toast((e as Error).message, 'danger') })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowLabel: { position: 'absolute', left: 0, justifyContent: 'center', gap: 1 },
  dayHead: { position: 'absolute', top: 0, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 1 },
  dow: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.88, textTransform: 'uppercase' },
  band: { position: 'absolute', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cell: { position: 'absolute', borderRadius: 10, padding: 8, justifyContent: 'space-between', overflow: 'hidden' },
  dot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4 },
  halfDay: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
  },
  todayRing: { position: 'absolute', borderRadius: 14, borderWidth: 1.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 10, marginTop: 'auto' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  leave: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
