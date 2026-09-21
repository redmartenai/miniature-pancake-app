import { create } from 'zustand';

import type { AuthSession, Membership, MembershipRole, Role, School, User } from '@/api/types';
import { IS_DRIVER_APP } from '@/lib/config';

import { appStorage, secureStorage } from './storage';

const TOKENS_KEY = 'eduflow.tokens';
const PROFILE_KEY = 'eduflow.profile';

type Profile = { user: User; memberships: Membership[]; schoolId: string; role: Role };

/** Which part of the app a role uses. */
export type Experience = 'family' | 'staff' | 'driver';

export const ROLE_EXPERIENCE: Record<Role, Experience> = {
  parent: 'family',
  student: 'family',
  teacher: 'staff',
  principal: 'staff',
  admin: 'staff',
  accountant: 'staff',
  transport_manager: 'staff',
  driver: 'driver',
  attendant: 'driver',
};

const ROLE_PRIORITY: Role[] = [
  'teacher',
  'principal',
  'admin',
  'transport_manager',
  'accountant',
  'parent',
  'student',
  'driver',
  'attendant',
];

function defaultRole(roles: MembershipRole[]): Role {
  const available = roles.map((r) => r.role);
  if (IS_DRIVER_APP) {
    const crew = available.find((r) => r === 'driver' || r === 'attendant');
    if (crew) return crew;
  }
  return ROLE_PRIORITY.find((r) => available.includes(r)) ?? available[0];
}

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  access?: string;
  refresh?: string;
  user?: User;
  memberships: Membership[];
  schoolId?: string;
  role?: Role;
  /** School picked on the first sign-in step, before we know who the user is. */
  pendingSchool?: School;

  hydrate: () => Promise<void>;
  setPendingSchool: (school?: School) => void;
  signIn: (session: AuthSession) => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setProfile: (user: User, memberships: Membership[]) => Promise<void>;
  selectSchool: (schoolId: string) => Promise<void>;
  selectRole: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
};

async function persistProfile(state: Pick<SessionState, 'user' | 'memberships' | 'schoolId' | 'role'>) {
  if (state.user && state.schoolId && state.role) {
    await appStorage.setJson(PROFILE_KEY, {
      user: state.user,
      memberships: state.memberships,
      schoolId: state.schoolId,
      role: state.role,
    } satisfies Profile);
  }
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  memberships: [],

  hydrate: async () => {
    const [tokens, profile] = await Promise.all([
      secureStorage.get(TOKENS_KEY),
      appStorage.getJson<Profile>(PROFILE_KEY),
    ]);
    if (!tokens || !profile) {
      set({ status: 'signedOut' });
      return;
    }
    try {
      const { access, refresh } = JSON.parse(tokens) as { access: string; refresh: string };
      set({ status: 'signedIn', access, refresh, ...profile });
    } catch {
      set({ status: 'signedOut' });
    }
  },

  setPendingSchool: (school) => set({ pendingSchool: school }),

  signIn: async ({ access, refresh, user, memberships }) => {
    const pending = get().pendingSchool;
    const membership = memberships.find((m) => m.school.id === pending?.id) ?? memberships[0];
    const role = defaultRole(membership.roles);
    await secureStorage.set(TOKENS_KEY, JSON.stringify({ access, refresh }));
    const next = { user, memberships, schoolId: membership.school.id, role };
    await persistProfile({ ...next });
    set({ status: 'signedIn', access, refresh, pendingSchool: undefined, ...next });
  },

  setTokens: async (access, refresh) => {
    await secureStorage.set(TOKENS_KEY, JSON.stringify({ access, refresh }));
    set({ access, refresh });
  },

  setProfile: async (user, memberships) => {
    const state = get();
    const membership = memberships.find((m) => m.school.id === state.schoolId) ?? memberships[0];
    if (!membership) {
      await get().signOut();
      return;
    }
    const role = membership.roles.some((r) => r.role === state.role) ? state.role! : defaultRole(membership.roles);
    const next = { user, memberships, schoolId: membership.school.id, role };
    await persistProfile(next);
    set(next);
  },

  selectSchool: async (schoolId) => {
    const membership = get().memberships.find((m) => m.school.id === schoolId);
    if (!membership) return;
    const role = defaultRole(membership.roles);
    const next = { schoolId, role, user: get().user, memberships: get().memberships };
    await persistProfile(next);
    set({ schoolId, role });
  },

  selectRole: async (role) => {
    const next = { role, user: get().user, memberships: get().memberships, schoolId: get().schoolId };
    await persistProfile(next);
    set({ role });
  },

  signOut: async () => {
    await Promise.all([secureStorage.remove(TOKENS_KEY), appStorage.remove(PROFILE_KEY)]);
    set({
      status: 'signedOut',
      access: undefined,
      refresh: undefined,
      user: undefined,
      memberships: [],
      schoolId: undefined,
      role: undefined,
    });
  },
}));

export function useActiveSchool(): School | undefined {
  return useSession((s) => s.memberships.find((m) => m.school.id === s.schoolId)?.school);
}

export function useActiveMembership(): Membership | undefined {
  return useSession((s) => s.memberships.find((m) => m.school.id === s.schoolId));
}

export function useExperience(): Experience | undefined {
  return useSession((s) => (s.role ? ROLE_EXPERIENCE[s.role] : undefined));
}
