import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Col, Row } from '@/features/console/Page';
import { DataTable, Pager, TableFoot } from '@/features/console/Table';
import { formatClock, formatDate, monthName, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Card, Highlight, Kicker, Pill, TearCal, Text } from '@/ui';

import type { StaffAttendance } from '../api';
import { HeatGrid } from './HeatGrid';

type Row_ = StaffAttendance['checkins'][number];

/** Staff attendance: the morning check-in in a sentence, who's out, 10 days of staff registers and today's check-ins. */
export function StaffView({ data }: { data: StaffAttendance }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const when = data.is_today
    ? t('console.admin.attendance.whenToday')
    : t('console.admin.attendance.whenPast', { date: formatDate(data.date) });
  const d = data.date;
  const first = data.checkins
    .map((c) => c.check_in)
    .filter(Boolean)
    .sort()[0];
  const statusRows = (['present', 'late', 'absent', 'leave', 'unmarked'] as const).map((k) => ({
    key: k,
    value: data.status[k],
    color:
      k === 'present'
        ? colors.ok
        : k === 'late'
          ? colors.warn
          : k === 'absent'
            ? colors.bad
            : k === 'leave'
              ? colors.pMintInk
              : colors.lineStrong,
  }));
  const tone = (s: Row_['status']) => (s === 'present' ? 'ok' : s === 'late' ? 'warn' : s === 'absent' ? 'bad' : 'info');
  return (
    <>
      <Row align="flex-start">
        <Col span={8}>
          <View style={[styles.row, { alignItems: 'flex-start', gap: 28, paddingTop: 4 }]}>
            <TearCal month={monthName(d, true)} day={Number(d.slice(8, 10))} dow={weekdayName(d)} />
            <View style={{ flex: 1, gap: 14, paddingTop: 2 }}>
              <Kicker>{t('console.admin.attendance.staffView.kicker', { time: first ? formatClock(first) : '—' })}</Kicker>
              <Text style={[styles.sentence, { color: colors.ink }]}>
                {data.marked ? (
                  <Trans
                    i18nKey="console.admin.attendance.staffView.sentence"
                    values={{
                      in: data.teachers.in,
                      total: data.teachers.total,
                      support: data.support.in,
                      supportTotal: data.support.total,
                      when,
                    }}
                    components={{ m: <Highlight color="mint" />, b: <Highlight /> }}
                  />
                ) : (
                  t('console.admin.attendance.staffView.sentenceNone', { when })
                )}
              </Text>
            </View>
          </View>
        </Col>
        <Col span={4}>
          <Card pad={0} style={{ paddingVertical: 18, paddingHorizontal: 20, gap: 12 }}>
            <Text variant="h4" accessibilityRole="header">
              {t('console.admin.attendance.staffView.missing')}
            </Text>
            <View>
              {statusRows.map((r) => (
                <View key={r.key} style={[styles.row, { gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderColor: colors.line }]}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: r.color }} />
                  <Text variant="sm" style={{ flex: 1 }}>
                    {t(`console.admin.attendance.staffView.${r.key}`)}
                  </Text>
                  <Text variant="sm" weight={700} num>
                    {r.value}
                  </Text>
                </View>
              ))}
              <Text variant="xs" color="muted" style={{ paddingTop: 9 }}>
                {data.missing.length
                  ? data.missing.map((m) => `${m.name} (${t(`console.admin.attendance.staffView.${m.status}`)})`).join(', ')
                  : t('console.admin.attendance.staffView.nobodyOut')}
              </Text>
            </View>
          </Card>
        </Col>
      </Row>

      <Card pad={22} style={{ gap: 18 }}>
        <View style={{ gap: 2 }}>
          <Text variant="h3" accessibilityRole="header">
            {t('console.admin.attendance.staffView.grid')}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.admin.attendance.staffView.gridSub')}
          </Text>
        </View>
        <View style={{ maxWidth: 760 }}>
          <HeatGrid
            days={data.days}
            lastIsToday={data.is_today}
            labelWidth={80}
            label={t('console.admin.attendance.staffView.gridSub')}
            sections={data.heat.map((h) => ({ label: t(`console.admin.attendance.staffView.${h.key}`), grade: h.key, values: h.values }))}
          />
        </View>
      </Card>

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <View style={{ padding: 22, gap: 2 }}>
          <Text variant="h3" accessibilityRole="header">
            {t('console.admin.attendance.staffView.checkins')}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.admin.attendance.staffView.checkinsSub')}
          </Text>
        </View>
        <DataTable<Row_>
          dense
          rows={data.checkins.slice((page - 1) * PAGE, page * PAGE)}
          rowKey={(r) => r.id}
          empty={
            <Text variant="sm" color="muted" style={{ padding: 16 }}>
              {t('console.admin.attendance.staffView.empty')}
            </Text>
          }
          columns={[
            {
              key: 'name',
              title: t('console.admin.attendance.staffView.name'),
              flex: 2,
              render: (r) => (
                <View style={[styles.row, { gap: 10 }]}>
                  <Avatar name={r.name} size="sm" />
                  <Text variant="sm" weight={700}>
                    {r.name}
                  </Text>
                </View>
              ),
            },
            {
              key: 'role',
              title: t('console.admin.attendance.staffView.role'),
              flex: 1,
              render: (r) => (
                <Text variant="xs" color="ink2">
                  {t(
                    r.kind === 'teacher' ? 'console.admin.attendance.staffView.teacher' : 'console.admin.attendance.staffView.supportStaff',
                  )}
                </Text>
              ),
            },
            {
              key: 'in',
              title: t('console.admin.attendance.staffView.in'),
              width: 100,
              render: (r) => (
                <Text variant="sm" num>
                  {r.check_in ? formatClock(r.check_in) : '—'}
                </Text>
              ),
            },
            {
              key: 'out',
              title: t('console.admin.attendance.staffView.out'),
              width: 100,
              render: (r) => (
                <Text variant="sm" num>
                  {r.check_out ? formatClock(r.check_out) : '—'}
                </Text>
              ),
            },
            {
              key: 'status',
              title: t('console.admin.attendance.staffView.status'),
              width: 130,
              render: (r) => <Pill label={t(`console.admin.attendance.staffView.${r.status}`)} tone={tone(r.status)} />,
            },
            {
              key: 'source',
              title: t('console.admin.attendance.staffView.source'),
              width: 110,
              render: (r) => (
                <Text variant="xs" color="muted" style={{ fontFamily: fonts.semibold }}>
                  {t(`console.admin.attendance.staffView.sources.${r.source}`)}
                </Text>
              ),
            },
          ]}
        />
        <TableFoot right={<Pager page={page} pageSize={PAGE} total={data.checkins.length} onPage={setPage} />} />
      </Card>
    </>
  );
}

const PAGE = 15;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sentence: { fontFamily: fonts.displayMedium, fontSize: 27, lineHeight: 36, letterSpacing: -0.6 },
});
