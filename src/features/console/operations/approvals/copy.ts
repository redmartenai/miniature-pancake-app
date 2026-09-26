import type { TFunction } from 'i18next';

import { formatInrShort } from '@/features/console/operations/format';
import { formatDate, formatInr, formatTime, parseDate } from '@/lib/format';

import type { Approval } from './api';

export const P = 'console.operations.approvals';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Wed 23 Sep" */
export function dayLabel(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Wed 23 Sep", "1–2 Oct", "30 Sep–2 Oct". */
export function dateRange(from: string, to: string): string {
  if (from === to) return dayLabel(from);
  const a = parseDate(from);
  const b = parseDate(to);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${formatDate(b)}` : `${formatDate(a)}–${formatDate(b)}`;
}

/** "214 KB", "1.2 MB". */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** 28.0 → "28", 28.5 → "28.5". */
export function mark(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Two digits for roll numbers on the register ("03"). */
export function roll(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n).padStart(2, '0');
}

export function money(amount: string | number): string {
  return Number(amount) >= 1e5 ? formatInrShort(amount) : formatInr(amount);
}

export function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** The in-tray age: "2h" under a day, then "3d". */
export function age(t: TFunction, hours: number): string {
  return hours < 24 ? t(`${P}.hours`, { count: Math.max(1, hours) }) : t(`${P}.days`, { count: Math.floor(hours / 24) });
}

export function isSameDay(iso: string, today: string): boolean {
  const d = new Date(iso);
  const t = parseDate(today);
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

/** "12:08 PM" today, otherwise "25 Sep, 3:19 PM". */
export function when(iso: string, today: string): string {
  return isSameDay(iso, today) ? formatTime(iso) : `${formatDate(new Date(iso))}, ${formatTime(iso)}`;
}

/** The list row's two lines. */
export function rowText(t: TFunction, item: Approval): { title: string; sub: string } {
  const name = item.requested_by?.name ?? '';
  switch (item.kind) {
    case 'marks': {
      const d = item.details;
      const sub = [t(`${P}.row.marksSub`, { name, count: d.entries.length })];
      if (d.checked_by) sub.push(t(`${P}.row.hodChecked`));
      return { title: t(`${P}.row.marksTitle`, { class: d.class, subject: d.subject, exam: d.exam }), sub: sub.join(' · ') };
    }
    case 'leave': {
      const d = item.details;
      const range = dateRange(d.from_date, d.to_date);
      const dates = d.half_day ? t(`${P}.row.halfDay`, { date: range }) : range;
      const sub = [d.person.subject ?? item.requester_title, t(`${P}.leaveKind.${d.leave_kind}`)];
      if (d.cover_periods) sub.push(t(`${P}.row.periods`, { count: d.cover_periods }));
      return { title: t(`${P}.row.leaveTitle`, { name: d.person.name, dates }), sub: sub.filter(Boolean).join(' · ') };
    }
    case 'refund': {
      const d = item.details;
      return {
        title: t(`${P}.row.refundTitle`, { amount: money(d.amount), head: lowerFirst(d.fee_head), class: d.student.class }),
        sub: `${d.student.name} · ${lowerFirst(d.reason.split(/[;.]/)[0])}`,
      };
    }
    case 'admission': {
      const d = item.details;
      const docs = d.documents_verified
        ? t(`${P}.row.docsVerified`)
        : d.documents_pending
          ? t(`${P}.row.docsPending`, { docs: d.documents_pending })
          : t(`${P}.row.docsOpen`);
      const sub = [docs];
      if (d.sibling) sub.push(t(`${P}.row.siblingIn`, { class: d.sibling.class }));
      return { title: t(`${P}.row.admissionTitle`, { child: d.child, grade: d.grade }), sub: sub.join(' · ') };
    }
    case 'attendance': {
      const d = item.details;
      return {
        title: t(`${P}.row.attendanceTitle`, { class: d.class, date: dayLabel(d.date) }),
        sub: `${name} · ${t(`${P}.row.changes`, { count: d.entries.length })}`,
      };
    }
  }
}

/** A decided row's title ("Sunita Verma · leave, 26 Sep"). */
export function decidedTitle(t: TFunction, item: Approval): string {
  const name = item.requested_by?.name ?? '';
  switch (item.kind) {
    case 'marks':
      return t(`${P}.decidedRow.marks`, { class: item.details.class, subject: item.details.subject, name });
    case 'leave':
      return t(`${P}.decidedRow.leave`, { name: item.details.person.name, date: formatDate(item.details.from_date) });
    case 'refund':
      return t(`${P}.decidedRow.refund`, {
        amount: money(item.details.amount),
        head: lowerFirst(item.details.fee_head),
        class: item.details.student.class,
      });
    case 'admission':
      return t(`${P}.decidedRow.admission`, { child: item.details.child, grade: item.details.grade });
    case 'attendance':
      return t(`${P}.decidedRow.attendance`, { class: item.details.class, name });
  }
}

/** The detail pane's heading and one-line ask. */
export function headText(t: TFunction, item: Approval): { title: string; ask: string } {
  const name = item.requested_by?.name ?? '';
  switch (item.kind) {
    case 'marks': {
      const d = item.details;
      return {
        title: t(`${P}.head.marks`, { class: d.class, subject: d.subject }),
        ask: t(`${P}.ask.marks`, { name, count: d.entries.length, exam: d.exam }),
      };
    }
    case 'leave': {
      const d = item.details;
      return {
        title: t(`${P}.head.leave`, { name: d.person.name }),
        ask: t(`${P}.ask.leave`, {
          name: d.person.name,
          count: d.days,
          kind: t(`${P}.leaveKind.${d.leave_kind}`),
          dates: dateRange(d.from_date, d.to_date),
        }),
      };
    }
    case 'refund': {
      const d = item.details;
      const vars = { name, amount: formatInr(d.amount), payer: d.asked_by, student: d.student.name, class: d.student.class };
      return {
        title: t(`${P}.head.refund`, { amount: formatInr(d.amount) }),
        ask: t(`${P}.ask.${d.asked_by ? 'refund' : 'refundNoPayer'}`, vars),
      };
    }
    case 'admission': {
      const d = item.details;
      return {
        title: t(`${P}.head.admission`, { child: d.child }),
        ask: t(`${P}.ask.admission`, { name, child: d.child, grade: d.grade, year: d.academic_year }),
      };
    }
    case 'attendance': {
      const d = item.details;
      return {
        title: t(`${P}.head.attendance`, { class: d.class }),
        ask: t(`${P}.ask.attendance`, { name, count: d.entries.length, date: dayLabel(d.date) }),
      };
    }
  }
}

/** The person the decision goes back to. */
export function firstName(item: Approval): string {
  const name = item.kind === 'leave' ? item.details.person.name : (item.requested_by?.name ?? '');
  return name.replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0];
}

export function count(item: Approval): number {
  return item.kind === 'marks' || item.kind === 'attendance' ? item.details.entries.length : 1;
}
