import { create } from 'zustand';

import { appStorage } from './storage';

const KEY = 'eduflow.offline';

type OfflineState = {
  /** Study material ids downloaded on this device. */
  saved: string[];
  hydrate: () => Promise<void>;
  markSaved: (id: string) => void;
};

/** What this device has already downloaded, so lists can say "Saved offline". */
export const useOffline = create<OfflineState>((set, get) => ({
  saved: [],

  hydrate: async () => {
    const stored = await appStorage.getJson<{ saved: string[] }>(KEY);
    set({ saved: stored?.saved ?? [] });
  },

  markSaved: (id) => {
    if (get().saved.includes(id)) return;
    const saved = [...get().saved, id].slice(-200);
    set({ saved });
    void appStorage.setJson(KEY, { saved });
  },
}));
