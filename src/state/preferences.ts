import { create } from 'zustand';

import { appStorage } from './storage';

const KEY = 'eduflow.preferences';

export type ThemePref = 'system' | 'light' | 'dark';

type Stored = { theme: ThemePref };

type PreferencesState = Stored & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemePref) => void;
};

/** Device-level choices that survive sign-out (theme). */
export const usePreferences = create<PreferencesState>((set, get) => ({
  theme: 'system',
  hydrated: false,

  hydrate: async () => {
    const stored = await appStorage.getJson<Stored>(KEY);
    set({ theme: stored?.theme ?? 'system', hydrated: true });
  },

  setTheme: (theme) => {
    set({ theme });
    void appStorage.setJson(KEY, { theme: get().theme } satisfies Stored);
  },
}));
