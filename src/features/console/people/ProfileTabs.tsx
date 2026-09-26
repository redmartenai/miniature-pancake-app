import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CardHead, Col, Row } from '@/features/console/Page';
import { DataTable } from '@/features/console/Table';
import { downloadFile } from '@/lib/download';
import { fileSize, formatInr } from '@/lib/format';
import { Card, IconButton, Pill, Text, TileIcon, useToast, type PillTone } from '@/ui';

import { useProfile, type Profile } from './api';
import { clock, dayMonth, dowDayMonth } from './kit';
import {
  AcademicsChart,
  CalendarLegend,
  ExceptionLine,
  FeesCard,
  InteractionRow,
  MonthCalendar,
  RemarkList,
  shortExam,
  TransportCard,
} from './ProfileCards';

/* ------------------------------------------------------------------------------------------------ attendance */

export function AttendanceTab({ p, today }: { p: Profile; today: string }) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(p.attendance.month);
  const q = useProfile(p.id, month === p.attendance.month ? undefined : month);
  const att = (month === p.attendance.month ? p : q.data)?.attendance ?? p.attendance;
  const shift = (n: number) => {
    const d = new Date(`${month}-01T00:00:00`);
    d.setMonth(d.getMonth() + n);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const label = new Date(`${month}-01T00:00:00`).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const months = p.attendance.months.filter((m) => m.days > 0);
  return (
    <Row gap={20}>
      <Col span={5}>
        <Card pad={22} style={{ gap: 16 }}>
          <CardHead
            title={label}
            subtitle={t('console.people.profile.att.monthLine', {
              onTime: att.month_stats.on_time,
              late: att.month_stats.late,
              absent: att.month_stats.absent,
            })}
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <IconButton icon="chevronLeft" size="sm" label={t('console.people.profile.att.prev')} onPress={() => shift(-1)} />
                <IconButton
                  icon="chevronRight"
                  size="sm"
                  label={t('console.people.profile.att.next')}
                  onPress={() => shift(1)}
                  disabled={month >= today.slice(0, 7)}
                />
              </View>
            }
          />
          <MonthCalendar att={att} today={today} />
          <CalendarLegend />
        </Card>
      </Col>
      <Col span={7} gap={20}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <View style={{ padding: 22, paddingBottom: 14 }}>
            <CardHead
              title={t('console.people.profile.att.byMonth')}
              subtitle={t('console.people.profile.att.ytdLine', {
                present: p.attendance.ytd.present,
                days: p.attendance.ytd.days,
                target: p.attendance.ytd.target,
              })}
            />
          </View>
          <DataTable
            dense
            rows={months}
            rowKey={(m) => m.month}
            columns={[
              {
                key: 'm',
                title: t('console.people.profile.att.month'),
                render: (m) => new Date(`${m.month}-01T00:00:00`).toLocaleString('en-IN', { month: 'long' }),
              },
              { key: 'd', title: t('console.people.profile.att.days'), align: 'right', width: 130, render: (m) => String(m.days) },
              { key: 'a', title: t('console.people.profile.att.absent'), align: 'right', width: 90, render: (m) => String(m.absent) },
              { key: 'l', title: t('console.people.profile.att.late'), align: 'right', width: 90, render: (m) => String(m.late) },
              {
                key: 'p',
                title: t('console.people.profile.att.present'),
                align: 'right',
                width: 110,
                render: (m) => (m.percent === null ? '—' : `${m.percent}%`),
              },
            ]}
          />
        </Card>
        <Card pad={22} style={{ gap: 6 }}>
          <CardHead
            title={t('console.people.profile.att.log')}
            subtitle={t('console.people.profile.att.logSub', { count: p.attendance.log.length })}
          />
          {p.attendance.log.map((e) => (
            <ExceptionLine key={e.date} e={e} />
          ))}
          {!p.attendance.log.length ? (
            <Text variant="sm" color="muted">
              {t('console.people.profile.att.perfect')}
            </Text>
          ) : null}
        </Card>
      </Col>
    </Row>
  );
}

/* ------------------------------------------------------------------------------------------------ academics */

export function AcademicsTab({ p }: { p: Profile }) {
  const { t } = useTranslation();
  const toast = useToast();
  const a = p.academics;
  const print = (examId: string, name: string) =>
    downloadFile(`/console/students/${p.id}/report-card.pdf?exam=${examId}`, `${p.name.replace(/ /g, '_')}_${name.replace(/ /g, '_')}.pdf`)
      .then(() => toast(t('console.people.profile.printed')))
      .catch(() => toast(t('console.people.students.printFailed'), 'danger'));
  if (!a.subjects.length)
    return (
      <Card pad={22}>
        <Text variant="sm" color="muted">
          {t('console.people.profile.acad.none')}
        </Text>
      </Card>
    );
  return (
    <View style={{ gap: 20 }}>
      <Card pad={22} style={{ gap: 14 }}>
        <CardHead
          title={t('console.people.profile.acad.title')}
          subtitle={t('console.people.profile.acad.tabSub', { prev: a.previous_name ?? '', latest: a.latest_name ?? '' })}
        />
        <AcademicsChart p={p} height={300} />
      </Card>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <DataTable
          rows={a.subjects}
          rowKey={(s) => s.code}
          columns={[
            {
              key: 's',
              flex: 2,
              title: t('console.people.profile.acad.subject'),
              render: (s) => (
                <View>
                  <Text variant="sm" weight={700}>
                    {s.subject}
                  </Text>
                  <Text variant="xs" color="muted">
                    {s.teacher ?? ''}
                  </Text>
                </View>
              ),
            },
            {
              key: 'p',
              align: 'right',
              width: 110,
              title: shortExam(a.previous_name ?? ''),
              render: (s) => (s.previous === null ? '—' : String(Math.round(s.previous))),
            },
            { key: 'l', align: 'right', width: 110, title: shortExam(a.latest_name ?? ''), render: (s) => String(Math.round(s.latest)) },
            {
              key: 'g',
              width: 90,
              title: t('console.people.profile.acad.grade'),
              render: (s) => <Pill label={s.grade} tone={s.latest >= 80 ? 'ok' : s.latest >= 60 ? 'info' : 'warn'} dot={false} />,
            },
            {
              key: 'c',
              align: 'right',
              width: 120,
              title: t('console.people.profile.acad.classAvg'),
              render: (s) => (s.class_average === null ? '—' : String(Math.round(s.class_average))),
            },
            {
              key: 'd',
              align: 'right',
              width: 100,
              title: t('console.people.profile.acad.change'),
              render: (s) => (
                <Text variant="sm" weight={700} color={s.change === null ? 'muted' : s.change >= 0 ? 'ok' : 'bad'}>
                  {s.change === null ? '—' : `${s.change > 0 ? '+' : ''}${Math.round(s.change)}`}
                </Text>
              ),
            },
          ]}
        />
      </Card>
      <Row gap={20}>
        {a.exams.map((e) => (
          <Col key={e.id} span={6}>
            <Card pad={22} style={{ gap: 10 }}>
              <CardHead
                title={e.name}
                subtitle={t('console.people.profile.acad.examLine', {
                  pct: Math.round(e.percent),
                  grade: e.grade,
                  avg: e.class_average === null ? '—' : Math.round(e.class_average),
                })}
                right={
                  <IconButton icon="print" size="sm" label={t('console.people.profile.print')} onPress={() => void print(e.id, e.name)} />
                }
              />
              {e.note ? (
                <Text variant="sm" color="ink2">
                  {`“${e.note.body}” — ${e.note.author ?? ''}`}
                </Text>
              ) : (
                <Text variant="xs" color="muted">
                  {t('console.people.profile.acad.noNote')}
                </Text>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ homework */

const HW_TONE: Record<string, PillTone> = {
  open: 'brand',
  missing: 'bad',
  late: 'warn',
  submitted: 'info',
  reviewed: 'ok',
  returned: 'ok',
};

export function HomeworkTab({ p }: { p: Profile }) {
  const { t } = useTranslation();
  const h = p.homework;
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View style={{ padding: 22, paddingBottom: 14 }}>
        <CardHead
          title={t('console.people.profile.hw.title')}
          subtitle={t('console.people.profile.hw.tabSub', { onTime: h.on_time, assigned: h.assigned, late: h.late, count: h.incomplete })}
        />
      </View>
      <DataTable
        rows={h.all}
        rowKey={(r) => r.id}
        empty={
          <Text variant="sm" color="muted">
            {t('console.people.profile.hw.none')}
          </Text>
        }
        columns={[
          {
            key: 'sub',
            width: 150,
            title: t('console.people.profile.acad.subject'),
            render: (r) => (
              <Text variant="sm" weight={700}>
                {r.subject}
              </Text>
            ),
          },
          {
            key: 'title',
            flex: 2,
            title: t('console.people.profile.hw.work'),
            render: (r) => (
              <View>
                <Text variant="sm">{r.title}</Text>
                {r.remark ? (
                  <Text variant="xs" color="muted">
                    {`${r.remark}${r.grade ? ` · ${r.grade}` : ''}`}
                  </Text>
                ) : null}
              </View>
            ),
          },
          { key: 'set', width: 110, title: t('console.people.profile.hw.set'), render: (r) => dayMonth(r.assigned_on) },
          { key: 'due', width: 130, title: t('console.people.profile.hw.due'), render: (r) => dowDayMonth(r.due_date) },
          { key: 'by', width: 150, title: t('console.people.profile.hw.teacher'), render: (r) => r.teacher ?? '—' },
          {
            key: 'st',
            width: 130,
            title: t('console.people.profile.hw.status'),
            render: (r) => <Pill label={t(`console.people.profile.hw.state.${r.status}`)} tone={HW_TONE[r.status] ?? 'neutral'} />,
          },
        ]}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ remarks */

export function RemarksTab({ p, onAdd }: { p: Profile; onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <Card pad={22} style={{ gap: 16, maxWidth: 820 }}>
      <CardHead
        title={t('console.people.profile.remarks.title')}
        subtitle={t('console.people.profile.remarks.tabSub', { count: p.remarks.length })}
        right={<IconButton icon="plus" size="sm" label={t('console.people.profile.remarks.add')} onPress={onAdd} />}
      />
      <RemarkList items={p.remarks} />
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ fees */

const INV_TONE: Record<string, PillTone> = { paid: 'ok', overdue: 'bad', due: 'warn', partial: 'info' };

export function FeesTab({ p }: { p: Profile }) {
  const { t } = useTranslation();
  const toast = useToast();
  const f = p.fees;
  return (
    <Row gap={20}>
      <Col span={4}>
        <FeesCard p={p} onLedger={() => undefined} />
      </Col>
      <Col span={8} gap={20}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <View style={{ padding: 22, paddingBottom: 14 }}>
            <CardHead
              title={t('console.people.profile.fees.invoices')}
              subtitle={t('console.people.profile.fees.invoicesSub', { count: f.invoices.length })}
            />
          </View>
          <DataTable
            dense
            rows={f.invoices}
            rowKey={(i) => i.id}
            columns={[
              {
                key: 't',
                flex: 2,
                title: t('console.people.profile.fees.item'),
                render: (i) => (
                  <Text variant="sm" weight={600}>
                    {i.title}
                  </Text>
                ),
              },
              {
                key: 'd',
                width: 110,
                title: t('console.people.profile.hw.due'),
                render: (i) =>
                  dayMonth(i.due_date) +
                  (i.due_date.slice(0, 4) !== new Date().getFullYear().toString() ? ` ${i.due_date.slice(0, 4)}` : ''),
              },
              { key: 'a', width: 110, align: 'right', title: t('console.people.profile.fees.amount'), render: (i) => formatInr(i.amount) },
              {
                key: 'b',
                width: 110,
                align: 'right',
                title: t('console.people.profile.fees.balance'),
                render: (i) => formatInr(i.balance),
              },
              {
                key: 's',
                width: 110,
                title: t('console.people.profile.hw.status'),
                render: (i) => <Pill label={t(`console.people.profile.fees.state.${i.status}`)} tone={INV_TONE[i.status] ?? 'neutral'} />,
              },
            ]}
          />
        </Card>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <View style={{ padding: 22, paddingBottom: 14 }}>
            <CardHead
              title={t('console.people.profile.fees.receipts')}
              subtitle={t('console.people.profile.fees.receiptsSub', { count: f.payments.length })}
            />
          </View>
          <DataTable
            dense
            rows={f.payments}
            rowKey={(r) => r.id}
            empty={
              <Text variant="sm" color="muted">
                {t('console.people.profile.fees.noReceipts')}
              </Text>
            }
            columns={[
              {
                key: 'n',
                width: 190,
                title: t('console.people.profile.fees.receipt'),
                render: (r) => (
                  <Text variant="sm" weight={600} num>
                    {r.receipt_no ?? '—'}
                  </Text>
                ),
              },
              { key: 't', flex: 2, title: t('console.people.profile.fees.item'), render: (r) => r.title },
              {
                key: 'd',
                width: 110,
                title: t('console.people.profile.fees.paidOn'),
                render: (r) => (r.paid_at ? dayMonth(r.paid_at) : '—'),
              },
              {
                key: 'm',
                width: 100,
                title: t('console.people.profile.fees.method'),
                render: (r) => (r.method ? t(`console.people.profile.fees.methods.${r.method}`, { defaultValue: r.method }) : '—'),
              },
              { key: 'a', width: 100, align: 'right', title: t('console.people.profile.fees.amount'), render: (r) => formatInr(r.amount) },
              {
                key: 'pdf',
                width: 56,
                align: 'right',
                title: '',
                render: (r) => (
                  <IconButton
                    icon="download"
                    size="sm"
                    variant="bare"
                    label={t('console.people.profile.fees.download', { no: r.receipt_no ?? '' })}
                    onPress={() =>
                      void downloadFile(
                        `/fees/payments/${r.id}/receipt.pdf`,
                        `Receipt_${(r.receipt_no ?? r.id).replace(/\//g, '-')}.pdf`,
                      ).catch(() => toast(t('console.people.failed'), 'danger'))
                    }
                  />
                ),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}

/* ------------------------------------------------------------------------------------------------ transport */

export function TransportTab({ p, onTrack }: { p: Profile; onTrack: () => void }) {
  const { t } = useTranslation();
  const tr = p.transport;
  return (
    <Row gap={20}>
      <Col span={5}>
        <TransportCard p={p} onTrack={onTrack} />
      </Col>
      <Col span={7}>
        {tr ? (
          <Card pad={22} style={{ gap: 12 }}>
            <CardHead
              title={t('console.people.profile.tr.plan')}
              subtitle={t('console.people.profile.tr.planSub', { route: tr.route.name })}
            />
            {[
              [t('console.people.profile.tr.stopLabel'), tr.stop],
              [t('console.people.profile.tr.pickupAt'), clock(tr.pickup_at)],
              [t('console.people.profile.tr.dropLeaves'), clock(tr.drop_leaves)],
              [t('console.people.profile.tr.dropEta'), clock(tr.drop_eta)],
              [t('console.people.profile.tr.bus'), tr.vehicle ?? '—'],
              [t('console.people.profile.tr.crew'), [tr.driver?.name, tr.attendant?.name].filter(Boolean).join(' · ') || '—'],
            ].map(([k, v]) => (
              <View key={k} style={styles.kv}>
                <Text variant="sm" color="muted" style={{ width: 180 }}>
                  {k}
                </Text>
                <Text variant="sm" weight={600} style={{ flex: 1 }}>
                  {v}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
      </Col>
    </Row>
  );
}

/* ------------------------------------------------------------------------------------------------ documents */

export function DocumentsTab({ p }: { p: Profile }) {
  const { t } = useTranslation();
  const toast = useToast();
  const open = (d: Profile['documents'][number]) => {
    const name = `${d.title.replace(/[^\w\- ]+/g, '').replace(/ +/g, '_')}.pdf`;
    const path = d.exam_id ? `/console/students/${p.id}/report-card.pdf?exam=${d.exam_id}` : d.download!;
    downloadFile(path, name)
      .then(() => toast(t('console.people.profile.docs.downloaded')))
      .catch(() => toast(t('console.people.failed'), 'danger'));
  };
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View style={{ padding: 22, paddingBottom: 14 }}>
        <CardHead title={t('console.people.profile.docs.title')} subtitle={t('console.people.profile.docs.sub')} />
      </View>
      <DataTable
        rows={p.documents}
        rowKey={(d) => d.id}
        empty={
          <Text variant="sm" color="muted">
            {t('console.people.profile.docs.none')}
          </Text>
        }
        columns={[
          {
            key: 't',
            flex: 2,
            title: t('console.people.profile.docs.document'),
            render: (d) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TileIcon
                  icon={d.kind === 'report_card' ? 'award' : d.kind === 'circular' ? 'megaphone' : 'document'}
                  tone={d.kind === 'report_card' ? 'brand' : 'neutral'}
                  size="sm"
                />
                <View style={{ flexShrink: 1 }}>
                  <Text variant="sm" weight={700}>
                    {d.title}
                  </Text>
                  <Text variant="xs" color="muted">
                    {d.subtitle}
                  </Text>
                </View>
              </View>
            ),
          },
          {
            key: 'k',
            width: 150,
            title: t('console.people.profile.docs.kind'),
            render: (d) => t(`console.people.profile.docs.kinds.${d.kind}`, { defaultValue: d.kind }),
          },
          { key: 'd', width: 120, title: t('console.people.profile.docs.date'), render: (d) => (d.date ? dayMonth(d.date) : '—') },
          {
            key: 's',
            width: 100,
            align: 'right',
            title: t('console.people.profile.docs.size'),
            render: (d) => (d.size ? fileSize(d.size) : '—'),
          },
          {
            key: 'dl',
            width: 56,
            align: 'right',
            title: '',
            render: (d) => (
              <IconButton
                icon="download"
                size="sm"
                variant="bare"
                label={t('console.people.profile.docs.download', { title: d.title })}
                onPress={() => open(d)}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ interactions (full) */

export function InteractionsList({ p }: { p: Profile }) {
  return (
    <View>
      {p.interactions.map((e, i) => (
        <InteractionRow key={`${e.kind}${e.at}${i}`} e={e} first={i === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
