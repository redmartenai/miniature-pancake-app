import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { LeaveDetails } from '@/api/types';
import { formatDate, formatInr, formatTime, parseDate } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Highlight, Icon, Paper, Pill, RegisterDot, Stamp, TearCal, Text, type Mark } from '@/ui';

import type { Approval, ConsoleAdmission, ConsoleAttendance, ConsoleMarks, ConsoleRefund } from './api';
import { dayLabel, mark, P, roll } from './copy';
import { STAMP_TONE } from './InTray';

/** The paper document for one request: a marks register, a leave application, a refund slip, an admission file or a register change. */
export function RequestPaper({ item, checkerTitle }: { item: Approval; checkerTitle?: string | null }) {
  const stamp = item.status !== 'pending' ? <DecidedStamp status={item.status} /> : null;
  switch (item.kind) {
    case 'marks':
      return <MarksRegister d={item.details} stamp={stamp} checkerTitle={checkerTitle} />;
    case 'leave':
      return <LeavePaper d={item.details} stamp={stamp} />;
    case 'refund':
      return <RefundPaper d={item.details} stamp={stamp} />;
    case 'admission':
      return <AdmissionPaper d={item.details} stamp={stamp} />;
    case 'attendance':
      return <AttendancePaper d={item.details} stamp={stamp} />;
  }
}

function DecidedStamp({ status }: { status: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.bigStampWrap} pointerEvents="none">
      <Stamp
        tone={STAMP_TONE[status]}
        rotate={-9}
        style={[styles.bigStamp, { backgroundColor: colors.surface }]}
        textStyle={styles.bigStampText}>
        {t(`${P}.stamp.${status}`)}
      </Stamp>
    </View>
  );
}

function useSchoolName() {
  return useActiveSchool()?.name ?? '';
}

/** `.paper` with the register-style head: school eyebrow + title on the left, small facts on the right. */
function Sheet({
  eyebrow,
  title,
  right,
  children,
  stamp,
  label,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  stamp?: ReactNode;
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <Paper pad={0} style={styles.paper}>
      <View style={[styles.paperHead, { borderBottomColor: colors.lineStrong }]} accessibilityLabel={label}>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text rawColor={colors.muted} style={styles.eyebrow} numberOfLines={1}>
            {eyebrow}
          </Text>
          <Text variant="h3" style={{ marginTop: 5 }} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {right ? <View style={{ alignItems: 'flex-end' }}>{right}</View> : null}
      </View>
      {children}
      {stamp}
    </Paper>
  );
}

function Facts({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <Text key={line} variant="xs" color="muted" weight={600} style={{ lineHeight: 18, textAlign: 'right' }}>
          {line}
        </Text>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ marks */

const COLS = { roll: 34, q: 64, total: 104, delta: 34 };

function MarksRegister({ d, stamp, checkerTitle }: { d: ConsoleMarks; stamp: ReactNode; checkerTitle?: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useSchoolName();
  const entries = [...d.entries].sort((a, b) => (a.roll_no ?? 0) - (b.roll_no ?? 0));
  const questions = [...new Set(entries.map((e) => e.question).filter(Boolean))];
  const qHead = questions.length === 1 ? questions[0]! : t(`${P}.register.question`);
  const last = d.last_roll ?? d.class_size;
  const gap = (from: number, to: number) =>
    to < from
      ? null
      : to === from
        ? t(`${P}.register.gapOne`, { from: roll(from) })
        : t(`${P}.register.gap`, { from: roll(from), to: roll(to) });
  const lav = colors.pLavInk;
  const outOf = mark(d.out_of);
  const checker = d.checked_by;
  return (
    <Sheet
      eyebrow={t(`${P}.register.school`, { school })}
      title={t(`${P}.register.title`, { class: d.class, subject: d.subject, exam: d.exam })}
      right={
        <Facts
          lines={[
            t(`${P}.register.max`, { count: d.out_of }),
            ...(d.published_on ? [t(`${P}.register.published`, { date: formatDate(d.published_on) })] : []),
          ]}
        />
      }
      stamp={stamp}
      label={t(`${P}.register.label`, {
        class: d.class,
        subject: d.subject,
        count: entries.length,
        before: d.average_before,
        after: d.average_after,
      })}>
      <View
        style={[styles.gridRow, styles.gridHead, { backgroundColor: colors.subtle, borderBottomColor: colors.line }]}
        accessibilityRole="header">
        <Text numberOfLines={1} style={[styles.th, { width: COLS.roll, color: colors.muted }]}>
          {t(`${P}.register.roll`)}
        </Text>
        <Text style={[styles.th, { flex: 1, color: colors.muted }]}>{t(`${P}.register.student`)}</Text>
        <Text numberOfLines={1} style={[styles.th, { width: COLS.q, color: colors.muted }]}>
          {qHead}
        </Text>
        <Text style={[styles.th, { width: COLS.total, color: colors.muted }]}>{t(`${P}.register.total`, { count: outOf })}</Text>
        <Text style={[styles.th, { width: COLS.delta, textAlign: 'right', color: colors.muted }]}>±</Text>
      </View>
      {entries.map((e, i) => {
        const next = entries[i + 1]?.roll_no;
        const after = e.roll_no !== null ? gap(e.roll_no + 1, next !== undefined && next !== null ? next - 1 : last) : null;
        const delta = e.to - e.from;
        const rest = e.question_from === null ? e.note.replace(/^\s*Q\d+[a-z]?\s*·\s*/, '') : '';
        return (
          <Fragment key={`${e.roll_no}-${e.student}`}>
            <View style={[styles.gridRow, styles.markRow, { borderBottomColor: colors.rule }]} accessibilityRole="text">
              <Text variant="xs" color="muted" weight={700} num style={{ width: COLS.roll }}>
                {roll(e.roll_no)}
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {e.student}
                </Text>
                {rest ? (
                  <Text variant="xxs" color="muted" numberOfLines={1}>
                    {rest}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.cell, { width: COLS.q, gap: 7 }]}>
                {e.question_from !== null && e.question_to !== null ? (
                  <>
                    <Text variant="sm" color="muted" num style={styles.struck}>
                      {mark(e.question_from)}
                    </Text>
                    <Text variant="sm" num rawColor={lav} style={{ fontFamily: fonts.extrabold }}>
                      {mark(e.question_to)}
                    </Text>
                  </>
                ) : (
                  <Text variant="sm" color="muted">
                    {questions.length === 1 ? '—' : (e.question ?? '—')}
                  </Text>
                )}
              </View>
              <View style={[styles.cell, { width: COLS.total, gap: 6 }]}>
                <Text variant="sm" color="muted" num style={styles.struck}>
                  {mark(e.from)}
                </Text>
                <Icon name="arrowRight" size={13} rawColor={colors.muted} />
                <Text variant="sm" num style={{ fontFamily: fonts.extrabold }}>
                  <Highlight color="lav">{mark(e.to)}</Highlight>
                </Text>
              </View>
              <Text
                variant="xs"
                num
                rawColor={delta >= 0 ? lav : colors.bad}
                style={{ width: COLS.delta, textAlign: 'right', fontFamily: fonts.extrabold }}>
                {`${delta >= 0 ? '+' : '−'}${mark(Math.abs(delta))}`}
              </Text>
            </View>
            {after ? <GapRow text={after} /> : null}
          </Fragment>
        );
      })}
      <View style={styles.paperFoot}>
        <Text variant="sm" color="ink2" numberOfLines={1} style={{ flexShrink: 0 }}>
          {`${t(`${P}.register.average`)} `}
          <Text variant="sm" num weight={700}>{`${d.average_before}%`}</Text>
          {' → '}
          <Text variant="sm" num style={{ fontFamily: fonts.extrabold }}>
            <Highlight color="lav">{`${d.average_after}%`}</Highlight>
          </Text>
        </Text>
        <Text variant="xs" color="muted" style={{ fontFamily: fonts.italic, flexShrink: 1, textAlign: 'right' }} numberOfLines={2}>
          {checker
            ? checkerTitle
              ? t(`${P}.register.checkedTitle`, { name: checker, title: hodTitle(checkerTitle) })
              : t(`${P}.register.checked`, { name: checker })
            : t(`${P}.register.unchecked`)}
        </Text>
      </View>
    </Sheet>
  );
}

/** "Science · HOD" → "HOD Science". */
function hodTitle(title: string): string {
  const m = /^(.+?)\s*·\s*HOD$/.exec(title);
  return m ? `HOD ${m[1]}` : title;
}

function GapRow({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.gapRow, { backgroundColor: colors.subtle, borderBottomColor: colors.rule }]}>
      <Text rawColor={colors.muted} style={styles.gapText}>
        {text}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------ label / value grid */

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.field, wide && { flexBasis: '100%' }]}>
      <Text rawColor={colors.muted} style={styles.fieldLabel}>
        {label}
      </Text>
      {typeof children === 'string' ? (
        <Text variant="sm" weight={700}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

function Fields({ children }: { children: ReactNode }) {
  return <View style={styles.fields}>{children}</View>;
}

/* ------------------------------------------------------------------ leave */

function LeavePaper({ d, stamp }: { d: LeaveDetails; stamp: ReactNode }) {
  const { t } = useTranslation();
  const school = useSchoolName();
  const days = d.half_day ? t(`${P}.leave.halfDay`) : t(`${P}.leave.daysValue`, { count: d.days });
  return (
    <Sheet
      eyebrow={t(`${P}.leave.paper`, { school })}
      title={`${t(`${P}.leaveKindTitle.${d.leave_kind}`)} · ${d.person.name}`}
      stamp={stamp}>
      <View style={styles.leaveBody}>
        <TearCal date={parseDate(d.from_date)} />
        <Fields>
          <Field label={t(`${P}.leave.from`)}>{dayLabel(d.from_date)}</Field>
          <Field label={t(`${P}.leave.to`)}>{dayLabel(d.to_date)}</Field>
          <Field label={t(`${P}.leave.days`)}>{days}</Field>
          <Field label={t(`${P}.leave.cover`)}>
            {d.cover_periods ? t(`${P}.leave.coverValue`, { count: d.cover_periods }) : t(`${P}.leave.coverNone`)}
          </Field>
          <Field label={t(`${P}.leave.balance`)}>
            {t(`${P}.leave.balanceValue`, { left: Math.max(0, d.left_after), allowed: d.allowed })}
          </Field>
          <Field label={t(`${P}.leave.kind`)}>{t(`${P}.leaveKindTitle.${d.leave_kind}`)}</Field>
        </Fields>
      </View>
    </Sheet>
  );
}

/* ----------------------------------------------------------------- refund */

function RefundPaper({ d, stamp }: { d: ConsoleRefund; stamp: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useSchoolName();
  const method = (m: string) => t(`${P}.refund.methods.${m}`, { defaultValue: m.toUpperCase() });
  return (
    <Sheet
      eyebrow={t(`${P}.refund.paper`, { school })}
      title={`${d.student.name} · ${d.student.class}`}
      right={
        <>
          <Text variant="xs" color="muted" weight={600}>
            {t(`${P}.refund.amount`)}
          </Text>
          <Text variant="h2" num>
            {formatInr(d.amount)}
          </Text>
        </>
      }
      stamp={stamp}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
        <Fields>
          <Field label={t(`${P}.refund.head`)}>{d.fee_head}</Field>
          <Field label={t(`${P}.refund.paidOn`)}>{d.paid_on ? formatDate(d.paid_on, { weekday: true }) : '—'}</Field>
          <Field label={t(`${P}.refund.method`)}>{method(d.method)}</Field>
          <Field label={t(`${P}.refund.receipt`)}>{d.receipt_no ?? '—'}</Field>
        </Fields>
      </View>
      <View
        style={[
          styles.gridRow,
          styles.gridHead,
          { backgroundColor: colors.subtle, borderBottomColor: colors.line, borderTopWidth: 1, borderTopColor: colors.line },
        ]}>
        <Text style={[styles.th, { flex: 1, color: colors.muted, textTransform: 'none', letterSpacing: 0 }]} numberOfLines={1}>
          {t(`${P}.refund.payments`, { title: d.invoice.title, amount: formatInr(d.invoice.amount) })}
        </Text>
      </View>
      {d.invoice.payments.map((p) => (
        <View key={p.id} style={[styles.gridRow, styles.markRow, { borderBottomColor: colors.rule }]}>
          <Text variant="xs" weight={700} num style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
            {p.receipt_no ?? '—'}
          </Text>
          <Text variant="sm" color="ink2" style={{ width: 118 }} numberOfLines={1}>
            {p.paid_at ? `${formatDate(new Date(p.paid_at))}, ${formatTime(p.paid_at)}` : '—'}
          </Text>
          {p.refunded ? <Pill label={t(`${P}.refund.thisOne`)} tone="pink" dot={false} style={{ alignSelf: 'center' }} /> : null}
          <Text variant="sm" num weight={800} style={{ width: 80, textAlign: 'right' }}>
            {formatInr(p.amount)}
          </Text>
        </View>
      ))}
      <View style={styles.paperFoot}>
        <Text variant="xs" color="muted" style={{ fontFamily: fonts.italic }}>
          {d.asked_by ? t(`${P}.refund.askedBy`, { name: d.relationship ? `${d.asked_by} (${d.relationship})` : d.asked_by }) : ''}
        </Text>
      </View>
    </Sheet>
  );
}

/* -------------------------------------------------------------- admission */

function AdmissionPaper({ d, stamp }: { d: ConsoleAdmission; stamp: ReactNode }) {
  const { t } = useTranslation();
  const school = useSchoolName();
  const none = t(`${P}.admission.none`);
  return (
    <Sheet
      eyebrow={t(`${P}.admission.paper`, { school })}
      title={`${d.child} · ${t(`${P}.admission.gradeValue`, { grade: d.grade, year: d.academic_year })}`}
      right={<Facts lines={[d.application_no]} />}
      stamp={stamp}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
        <Fields>
          <Field label={t(`${P}.admission.guardian`)}>{d.guardian_name || none}</Field>
          <Field label={t(`${P}.admission.assessment`)}>
            {d.assessment_score !== null
              ? t(`${P}.admission.assessmentValue`, { score: d.assessment_score, outOf: d.assessment_out_of })
              : none}
          </Field>
          <Field label={t(`${P}.admission.interaction`)}>{d.interaction_on ? formatDate(d.interaction_on, { weekday: true }) : none}</Field>
          <Field label={t(`${P}.admission.documents`)}>
            {d.documents_verified ? (
              <Pill label={t(`${P}.admission.verified`)} tone="ok" />
            ) : (
              <Pill
                label={d.documents_pending ? t(`${P}.admission.pending`, { docs: d.documents_pending }) : t(`${P}.admission.notVerified`)}
                tone="warn"
              />
            )}
          </Field>
          <Field label={t(`${P}.admission.sibling`)}>{d.sibling ? `${d.sibling.name} · ${d.sibling.class}` : none}</Field>
          <Field label={t(`${P}.admission.seats`, { grade: d.grade })}>
            {d.seats_left !== null && d.seats !== null ? t(`${P}.admission.seatsValue`, { left: d.seats_left, seats: d.seats }) : none}
          </Field>
        </Fields>
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------- attendance */

const DOT: Record<string, Mark> = { present: 'p', absent: 'a', late: 'l', leave: 'off', half_day: 'l', excused: 'off' };

function AttendancePaper({ d, stamp }: { d: ConsoleAttendance; stamp: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useSchoolName();
  const status = (s: string) => t(`${P}.attendance.status.${s}`, { defaultValue: s });
  return (
    <Sheet
      eyebrow={t(`${P}.attendance.paper`, { school, number: d.number ? `AC-${String(d.number).padStart(4, '0')}` : '' })}
      title={t(`${P}.attendance.title`, { class: d.class, date: dayLabel(d.date) })}
      stamp={stamp}>
      <View style={[styles.gridRow, styles.gridHead, { backgroundColor: colors.subtle, borderBottomColor: colors.line }]}>
        <Text numberOfLines={1} style={[styles.th, { width: COLS.roll, color: colors.muted }]}>
          {t(`${P}.register.roll`)}
        </Text>
        <Text style={[styles.th, { flex: 1, color: colors.muted }]}>{t(`${P}.register.student`)}</Text>
        <Text style={[styles.th, { width: 120, color: colors.muted }]}>{t(`${P}.attendance.from`)}</Text>
        <Text style={[styles.th, { width: 120, color: colors.muted }]}>{t(`${P}.attendance.to`)}</Text>
      </View>
      {d.entries.map((e) => (
        <View key={e.student} style={[styles.gridRow, styles.markRow, { borderBottomColor: colors.rule }]}>
          <Text variant="xs" color="muted" weight={700} num style={{ width: COLS.roll }}>
            {roll(e.roll_no)}
          </Text>
          <Text variant="sm" weight={700} style={{ flex: 1 }} numberOfLines={1}>
            {e.student}
          </Text>
          <View style={[styles.cell, { width: 120, gap: 8 }]}>
            <RegisterDot mark={DOT[e.from] ?? 'p'} />
            <Text variant="sm" color="muted" style={styles.struck}>
              {status(e.from)}
            </Text>
          </View>
          <View style={[styles.cell, { width: 120, gap: 8 }]}>
            <RegisterDot mark={DOT[e.to] ?? 'p'} />
            <Text variant="sm" weight={800} rawColor={colors.pLavInk}>
              {status(e.to)}
            </Text>
          </View>
        </View>
      ))}
      <View style={{ height: 12 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  paper: { flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' },
  paperHead: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    borderBottomWidth: 1.5,
  },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 11 * 0.14, textTransform: 'uppercase' },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  gridHead: { paddingVertical: 9, borderBottomWidth: 1 },
  th: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 11 * 0.08, textTransform: 'uppercase' },
  markRow: { height: 50, borderBottomWidth: 1 },
  cell: { flexDirection: 'row', alignItems: 'center' },
  struck: { textDecorationLine: 'line-through' },
  gapRow: { paddingVertical: 6, paddingLeft: 60, paddingRight: 20, borderBottomWidth: 1 },
  gapText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  paperFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  bigStampWrap: { position: 'absolute', right: 26, top: 64 },
  bigStamp: { paddingHorizontal: 16, paddingVertical: 11 },
  bigStampText: { fontSize: 17, lineHeight: 18, letterSpacing: 17 * 0.16 },
  leaveBody: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingVertical: 20, alignItems: 'flex-start' },
  fields: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, columnGap: 20 },
  field: { flexBasis: '45%', flexGrow: 1, gap: 4 },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 11 * 0.1, textTransform: 'uppercase' },
});
