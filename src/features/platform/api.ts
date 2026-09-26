import { useQuery } from '@tanstack/react-query';

import { http, request } from '@/api/client';
import type { AuthSession } from '@/api/types';

export type SchoolRow = {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  kind: string;
  primary_color: string;
  is_active: boolean;
  students: number;
  staff: number;
  principal: { id: string; name: string; phone: string } | null;
  created_at: string;
  last_sign_in: string | null;
};

export type PersonStatus = 'temporary_password' | 'never_signed_in' | 'active';

export type SchoolDetail = SchoolRow & {
  short_name: string;
  accent_color: string;
  languages: string[];
  organization: string;
  campus: string | null;
  address: string | null;
  office_phone: string | null;
  year: { name: string; starts_on: string; ends_on: string } | null;
  terms: { name: string; starts_on: string; ends_on: string }[];
  grades: { grade: string; sections: string[] }[];
  sections: number;
  people: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: 'principal' | 'admin';
    title: string;
    is_active: boolean;
    status: PersonStatus;
    last_sign_in: string | null;
    invite_pending: boolean;
  }[];
  history: {
    id: string;
    name: string;
    role: string;
    method: 'password' | 'invite' | 'existing';
    reason: string;
    delivered: Record<string, string>;
    by: string | null;
    at: string;
  }[];
};

export type Slip = {
  school: { id: string; name: string; code: string };
  person: { id: string; name: string; phone: string; email: string | null; role: string };
  method: 'password' | 'invite' | 'existing';
  sign_in_url: string;
  password: string | null;
  invite_url: string | null;
  expires_at: string | null;
  issue_id: string;
  delivered: Record<string, string>;
};

export type Overview = {
  schools: number;
  active: number;
  paused: number;
  students: number;
  staff: number;
  new_this_month: number;
  recent: SchoolRow[];
  pending: {
    kind: 'invite' | 'temporary_password';
    school: string;
    school_id: string;
    name: string;
    role: string;
    since: string | null;
    expires_at: string | null;
  }[];
};

export type Method = 'password' | 'invite';
export type Channel = 'sms' | 'email';

export type RegisterBody = {
  school: {
    name: string;
    code: string;
    short_name?: string;
    kind: string;
    city: string;
    state: string;
    campus: string;
    address: string;
    office_phone: string;
    primary_color: string;
    accent_color: string;
    languages: string[];
    organization?: string;
  };
  year: { name: string; starts_on: string; ends_on: string; terms: { name: string; starts_on: string; ends_on: string }[] };
  grades: { grade: string; sections: string[] }[];
  principal: { name: string; phone: string; email: string };
  admin?: { name: string; phone: string; email: string };
  method: Method;
  send: Channel[];
};

export const platformApi = {
  overview: () => http.get<Overview>('/platform/overview'),
  schools: (q: string, status: string) => http.get<{ items: SchoolRow[] }>(`/platform/schools?q=${encodeURIComponent(q)}&status=${status}`),
  checkCode: (code: string, name: string) =>
    http.post<{ code: string; valid: boolean; available: boolean; suggestion: string | null }>('/platform/schools/check-code', {
      code,
      name,
    }),
  register: (body: RegisterBody) => http.post<{ school: SchoolDetail; slips: Slip[] }>('/platform/schools', body),
  school: (id: string) => http.get<SchoolDetail>(`/platform/schools/${id}`),
  updateSchool: (id: string, body: Partial<SchoolDetail> & { is_active?: boolean }) =>
    http.patch<SchoolDetail>(`/platform/schools/${id}`, body),
  addPerson: (
    id: string,
    body: { name: string; phone: string; email: string; role: 'principal' | 'admin'; method: Method; send: Channel[] },
  ) => http.post<{ school: SchoolDetail; slip: Slip }>(`/platform/schools/${id}/people`, body),
  resetCredentials: (id: string, userId: string, body: { method: Method; send: Channel[] }) =>
    http.post<{ school: SchoolDetail; slip: Slip }>(`/platform/schools/${id}/people/${userId}/credentials`, body),
  invite: (token: string) =>
    request<{
      school: { name: string; code: string; primary_color: string };
      person: { name: string; phone: string; role: string };
      expires_at: string;
    }>(`/auth/invite/${token}`, { auth: false }),
  // Public: the invite link works whoever (if anyone) is signed in on this browser.
  acceptInvite: (token: string, password: string) => http.post<AuthSession>(`/auth/invite/${token}`, { password }, { auth: false }),
  changePassword: (current: string, next: string) =>
    http.post<{ user: AuthSession['user'] }>('/auth/password/change', { current, new: next }),
};

export function usePlatformQuery<T>(key: readonly unknown[], fn: () => Promise<T>, enabled = true) {
  return useQuery({ queryKey: ['platform', ...key], queryFn: fn, enabled });
}
