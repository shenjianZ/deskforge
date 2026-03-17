import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type JsonResultView = 'code' | 'tree';

interface PreferencesState {
  defaultIndent: 2 | 4;
  defaultCodeIndent: 2 | 4 | 8;
  autoCollapseInput: boolean;
  defaultJsonResultView: JsonResultView;
  wrapLongLines: boolean;
  setDefaultIndent: (value: 2 | 4) => void;
  setDefaultCodeIndent: (value: 2 | 4 | 8) => void;
  setAutoCollapseInput: (value: boolean) => void;
  setDefaultJsonResultView: (value: JsonResultView) => void;
  setWrapLongLines: (value: boolean) => void;
  reset: () => void;
}

const defaultPreferences = {
  defaultIndent: 2 as const,
  defaultCodeIndent: 4 as const,
  autoCollapseInput: true,
  defaultJsonResultView: 'tree' as JsonResultView,
  wrapLongLines: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      setDefaultIndent: (value) => set({ defaultIndent: value }),
      setDefaultCodeIndent: (value) => set({ defaultCodeIndent: value }),
      setAutoCollapseInput: (value) => set({ autoCollapseInput: value }),
      setDefaultJsonResultView: (value) => set({ defaultJsonResultView: value }),
      setWrapLongLines: (value) => set({ wrapLongLines: value }),
      reset: () => set(defaultPreferences),
    }),
    {
      name: 'cmdrs-preferences',
    }
  )
);
