import { http } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';

export type PeriodKey = string; // term1 | term2 | year

export type Reminder = { channels: ('app' | 'sms' | 'whatsapp' | 'call')[]; sent_at: string; status: string; note: string };

export type Family = {
  id: string;
  guardian: { id: string; name: string; phone: string } | null;
  children: { id: string; name: string; first_name: string; class: string }[];
  amount: string;
  overdue_days: number;
  oldest_due: string;
  last_reminder: Reminder | null;
};

export type Receipt = {
  id: string;
  receipt_no: string | null;
  paid_at: string | null;
  student: { id: string; name: string; class: string };
  title: string;
  method: string;
  amount: string;
  paid_by: string | null;
  pdf: string | null;
};

export type ReceiptDetail = Receipt & {
  invoice: { id: string; title: string; amount: string; paid_amount: string; balance: string; due_date: string };
  gateway_payment_id: string | null;
};

export type SegmentCounts = { all: number; over60: number; never: number; students: number };

export type FeesPayload = {
  as_of: string;
  academic_year: string | null;
  periods: { key: PeriodKey; name: string }[];
  current_period: PeriodKey;
  period: { key: PeriodKey; name: string; starts_on: string; ends_on: string; current: boolean };
  billed: string;
  collected: string;
  percent: number | null;
  overdue: { amount: string; students: number; families: number; oldest_days: number };
  on_plan: string;
  months: { month: string; amount: string; open: boolean; future: boolean }[];
  methods: Record<string, string>;
  target: { percent: number; by: string | null; amount: string; gap: string } | null;
  peak_due: { month: string; date: string } | null;
  online_share: number | null;
  method_shares: { method: string; percent: number | null }[];
  next_due: { date: string; days: number; title: string } | null;
  last_run: string | null;
  receipts_today: { count: number; amount: string; items: Receipt[] };
  refunds: {
    approval_id: string;
    amount: string;
    fee_head: string;
    student: string;
    class: string;
    reason: string;
    sla: { age_hours: number; sla_hours: number; past: boolean; past_by_hours: number; hours_left: number };
  }[];
  grades: {
    rows: { key: string; billed: string; collected: string; percent: number | null }[];
    threshold: number;
    under: string[];
    under_overdue_students: number;
  };
  structure: {
    academic_year: string;
    heads: string[];
    rows: { band: string; grades: string[]; amounts: Record<string, string> }[];
    schedule: { head: string; dates: string[]; optional: boolean }[];
    locked: boolean;
  } | null;
  ledger: { counts: SegmentCounts; preview: Family[] };
};

export type Segment = 'all' | 'over60' | 'never';

export type OverduePage = { counts: SegmentCounts; total: number; amount: string; page: number; page_size: number; items: Family[] };

export type ReminderResult = { families: number; students: number; amount: string; channels: Record<string, number> };

export const feesApi = {
  page: (period?: PeriodKey) => http.get<FeesPayload>(`/console/fees${period ? `?period=${period}` : ''}`),
  overdue: (p: { period: PeriodKey; segment: Segment; q: string; page: number; pageSize: number }) =>
    http.get<OverduePage>(
      `/console/fees/overdue?period=${p.period}&segment=${p.segment}&q=${encodeURIComponent(p.q)}&page=${p.page}&page_size=${p.pageSize}`,
    ),
  remind: (body: { period: PeriodKey; channels: string[]; family_ids?: string[]; all?: boolean; segment?: Segment; q?: string }) =>
    http.post<ReminderResult>('/console/fees/reminders', body),
  logCall: (body: { period: PeriodKey; guardian_id: string; status: 'answered' | 'no_answer'; note: string }) =>
    http.post<Reminder>('/console/fees/calls', body),
  receipts: () => http.get<{ date: string; count: number; amount: string; items: Receipt[] }>('/console/fees/receipts'),
  receipt: (id: string) => http.get<ReceiptDetail>(`/console/fees/receipts/${id}`),
  exportPath: (period: PeriodKey) => `/console/fees/export?period=${period}`,
};

export function useFees(period?: PeriodKey) {
  return useConsoleQuery(['fees', period ?? 'current'], () => feesApi.page(period));
}

export function useOverdue(p: { period: PeriodKey; segment: Segment; q: string; page: number; pageSize: number }, enabled: boolean) {
  return useConsoleQuery(['fees', 'overdue', p], () => feesApi.overdue(p), { enabled });
}
