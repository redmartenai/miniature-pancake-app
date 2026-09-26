import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/api/client';
import type { AdmissionDetails, ApprovalKind, AttendanceFixDetails, LeaveDetails, MarksDetails, RefundDetails } from '@/api/types';
import { useConsoleQuery } from '@/features/console/api';

export type { ApprovalKind };

export type Sla = { age_hours: number; sla_hours: number; due_at: string; past: boolean; past_by_hours: number; hours_left: number };

export type TrailStep = {
  action: 'submitted' | 'checked' | 'approved' | 'declined' | 'sent_back' | 'undone' | 'withdrawn';
  at: string | null;
  actor: { id: string; name: string; initials: string; title: string | null } | null;
  note: string;
};

export type Evidence = {
  id: string;
  name: string;
  kind: 'document' | 'scan';
  pages: number | null;
  size: number;
  type: string;
  url: string;
};

export type ConsoleMarks = Omit<MarksDetails, 'entries'> & {
  entries: (MarksDetails['entries'][number] & { question: string | null; question_from: number | null; question_to: number | null })[];
  published_on: string | null;
  class_size: number;
  last_roll: number | null;
  applied: boolean;
};
export type ConsoleRefund = RefundDetails & {
  status: string;
  invoice: {
    title: string;
    amount: string;
    payments: { id: string; amount: string; paid_at: string | null; method: string; receipt_no: string | null; refunded: boolean }[];
  };
};
export type ConsoleAdmission = AdmissionDetails & {
  seats: number | null;
  documents_pending: string;
  guardian_name: string;
  assessment_score: number | null;
  assessment_out_of: number;
  status: string;
};
export type ConsoleAttendance = Omit<AttendanceFixDetails, 'entries'> & {
  number: number;
  entries: (AttendanceFixDetails['entries'][number] & { roll_no: number | null })[];
};

type Base = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'sent_back' | 'withdrawn';
  summary: string;
  due_on: string | null;
  created_at: string;
  requested_by: { id: string; name: string; initials: string } | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  undo_until: string | null;
  sla: Sla | null;
  decide_today: boolean;
  requester_title: string | null;
  trail: TrailStep[];
  attachments: Evidence[];
};

/** One request as the console shows it: `details` is narrowed by `kind`. */
export type Approval =
  | (Base & { kind: 'marks'; details: ConsoleMarks })
  | (Base & { kind: 'leave'; details: LeaveDetails })
  | (Base & { kind: 'refund'; details: ConsoleRefund })
  | (Base & { kind: 'admission'; details: ConsoleAdmission })
  | (Base & { kind: 'attendance'; details: ConsoleAttendance });

export type InTray = {
  now: string;
  today: string;
  total: number;
  counts: Record<ApprovalKind, number>;
  past_sla: number;
  sla_hours: number;
  urgent: { names: string[]; day: string };
  items: Approval[];
  decided_today: { total: number; items: Approval[] };
  signer: string;
};

export type HistoryRange = 'today' | 'week' | 'all';
export type DecidedStatus = 'approved' | 'sent_back' | 'declined';
export type History = { total: number; counts: Record<DecidedStatus, number>; items: Approval[]; limit: number };

export type Rules = {
  sla_hours: Record<ApprovalKind, number>;
  default_hours: number;
  choices: number[];
  undo_minutes: number;
  note_required: string[];
  deciders: string[];
};

export type Decision = 'approve' | 'send_back' | 'reject';

export const KINDS: ApprovalKind[] = ['marks', 'leave', 'refund', 'admission', 'attendance'];

const BASE = '/console/approvals';

export const approvalsApi = {
  tray: () => http.get<InTray>(BASE),
  one: (id: string) => http.get<Approval>(`${BASE}/${id}`),
  history: (range: HistoryRange, status?: DecidedStatus) =>
    http.get<History>(`${BASE}/history?range=${range}${status ? `&status=${status}` : ''}`),
  rules: () => http.get<Rules>(`${BASE}/rules`),
  saveRules: (sla_hours: Partial<Record<ApprovalKind, number>>) => http.put<Rules>(`${BASE}/rules`, { sla_hours }),
  decide: (id: string, decision: Decision, note: string) => http.post<Approval>(`${BASE}/${id}/decide`, { decision, note }),
  undo: (id: string) => http.post<Approval>(`${BASE}/${id}/undo`),
};

export function useInTray() {
  return useConsoleQuery(['approvals', 'tray'], approvalsApi.tray, { refetchInterval: 60_000 });
}

export function useApproval(id: string | undefined, enabled: boolean) {
  return useConsoleQuery(['approvals', 'one', id], () => approvalsApi.one(id!), { enabled: !!id && enabled });
}

export function useHistory(range: HistoryRange, status: DecidedStatus | undefined, enabled: boolean) {
  return useConsoleQuery(['approvals', 'history', range, status ?? 'all'], () => approvalsApi.history(range, status), { enabled });
}

export function useRules(enabled: boolean) {
  return useConsoleQuery(['approvals', 'rules'], approvalsApi.rules, { enabled });
}

/** Decide, undo and save rules; every change refreshes the console (the sidebar's approvals badge included). */
export function useApprovalMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['console'] });
  return {
    decide: useMutation({
      mutationFn: (v: { id: string; decision: Decision; note: string }) => approvalsApi.decide(v.id, v.decision, v.note),
      onSuccess: refresh,
    }),
    undo: useMutation({ mutationFn: (id: string) => approvalsApi.undo(id), onSuccess: refresh }),
    saveRules: useMutation({ mutationFn: approvalsApi.saveRules, onSuccess: refresh }),
  };
}
