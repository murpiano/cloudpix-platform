import { readJSON, writeJSON } from '@/lib/storage';
import { createStore } from './store';

/** The pace of the main screen, kept per browser. The gear in the header edits it (plan 3). */
export interface Settings {
  /** Each photo on the main screen, 2–15 s. */
  photoSeconds: number;
  /** Each flight, 5–90 s. */
  flightSeconds: number;
  /** "Show how to use it". */
  help: boolean;
}

export const DEFAULT_SETTINGS: Settings = { photoSeconds: 5, flightSeconds: 30, help: true };

export const settingsStore = createStore<Settings>({
  ...DEFAULT_SETTINGS,
  ...readJSON<Partial<Settings>>('settings', {}),
});

settingsStore.subscribe(() => writeJSON('settings', settingsStore.get()));
