import { create } from 'zustand';

import { appStorage } from './storage';

const KEY = 'eduflow.lastAccount';

/**
 * Who last signed in on this device. It survives sign-out so the OTP screen can say
 * "Signing in as …" for a returning user without the server ever revealing who owns a number.
 */
export type LastAccount = {
  phone: string;
  name: string;
  initials: string;
  /** Role key, translated in the UI (roles.parent → "Parent"). */
  role: string;
  /** e.g. "Parent of Aarav (6-B) & Diya (2-A)" */
  detail?: string;
  schoolId: string;
  schoolName: string;
  schoolDetail?: string;
};

type State = {
  account?: LastAccount;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  remember: (account: LastAccount) => void;
  update: (patch: Partial<LastAccount>) => void;
};

export const useLastAccount = create<State>((set, get) => ({
  hydrated: false,
  hydrate: async () => {
    const account = (await appStorage.getJson<LastAccount>(KEY)) ?? undefined;
    set({ account, hydrated: true });
  },
  remember: (account) => {
    set({ account });
    void appStorage.setJson(KEY, account);
  },
  update: (patch) => {
    const current = get().account;
    if (!current) return;
    const next = { ...current, ...patch };
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    set({ account: next });
    void appStorage.setJson(KEY, next);
  },
}));

/** "+91 98450 •••21" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length < 10) return phone;
  return `+91 ${digits.slice(0, 5)} •••${digits.slice(8)}`;
}

/** Same number, ignoring spaces and the +91 prefix. */
export function samePhone(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.replace(/\D/g, '').slice(-10) === b.replace(/\D/g, '').slice(-10);
}
