import { http } from '@/api/client';
import type { ApprovalItem, ApprovalKind } from '@/api/types';

export type DashboardCell = { id: string; label: string; percent: number | null; marked: boolean };

export type Dashboard = {
  now: string;
  today: string;
  register: {
    grades: string[];
    letters: string[];
    cells: Record<string, DashboardCell>;
    sections: number;
    sections_marked: number;
    last_marked_at: string | null;
    present: number;
    total: number;
    call: {
      section: string;
      percent: number;
      from_percent: number | null;
      from_date: string | null;
      also: { label: string; percent: number }[];
      chronic_in_sections: number;
      chronic: number;
    } | null;
  };
  cover: {
    on_leave: string[];
    open: number;
    missed: number;
    periods: {
      period: number;
      state: 'done' | 'now' | 'todo';
      slots: number;
      open: number;
      covered: number;
      starts_at: string;
      ends_at: string;
    }[];
    open_rows: { period: number; starts_at: string; now: boolean; classes: string[]; free: string[] }[];
    placed: number[];
  };
  exams: {
    from_exam: string;
    to_exam: string;
    from_avg: number | null;
    to_avg: number | null;
    rows: { grade: string; from: number; to: number }[];
    down: { grade: string; delta: number; subject: { name: string; delta: number } | null } | null;
    up: { grade: string; delta: number } | null;
  } | null;
  intray: { total: number; top: ApprovalItem | null; next: { id: string; kind: ApprovalKind; name: string; summary: string }[] };
  buses: {
    out: number;
    total: number;
    routes: {
      route_id: string;
      route: string;
      state: 'waiting' | 'moving' | 'late' | 'done';
      delay_minutes: number;
      leaves_at: string;
      stops: number;
      position: number;
      passed: number;
    }[];
  };
  fees: {
    term: string | null;
    billed: string;
    collected: string;
    overdue: string;
    overdue_students: number;
    overdue_families: number;
    months: { month: string; amount: string }[];
    target: { percent: number; by: string | null };
    current_month: string;
  };
  coming_up: (
    | { kind: 'fees'; date: string; title_term: string | null; outstanding: string; outstanding_term: string | null }
    | { kind: 'event' | 'holiday'; date: string; title: string; starts: string; ends: string | null; booked: number; id: string }
    | { kind: 'exam'; date: string; title: string; papers: number; days: number }
  )[];
  next_exam: { name: string; date: string; school_days: number } | null;
};

export const dashboardApi = {
  get: () => http.get<Dashboard>('/console/dashboard'),
};
