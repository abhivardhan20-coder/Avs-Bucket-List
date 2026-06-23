import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings } from '../types';
import { fastDiff } from '../services/syncService';

interface SettingsStore {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setSettings: (settings: UserSettings) => void;
}

const defaultSettings: UserSettings = {
  autoplayTrailer: true,
  muteTrailer: true,
  compactView: false,
  conflictStrategy: 'lww',
  enableCloudSync: true
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (s) => set((state) => {
        const next = { ...state.settings, ...s };
        return fastDiff(next, state.settings) ? { settings: next } : { settings: state.settings };
      }),
      setSettings: (settings) => set({ settings })
    }),
    {
      name: 'av_settings',
    }
  )
);
