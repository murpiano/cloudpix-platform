import { readJSON, writeJSON } from '@/lib/storage';
import { clamp } from '@/lib/math';
import { createStore } from './store';

/** The pace of the main screen, kept per browser. */
export interface Settings {
  /** Each photo on the main screen, 2–15 s. */
  photoSeconds: number;
  /** Each flight, 5–90 s. */
  flightSeconds: number;
  /** Each photo of the slideshow in the photo window, 2–15 s. */
  slideSeconds: number;
  /** "Show how to use it". */
  help: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  photoSeconds: 5,
  flightSeconds: 30,
  slideSeconds: 4,
  help: true,
};

export const SETTING_LIMITS = {
  photoSeconds: [2, 15],
  flightSeconds: [5, 90],
  slideSeconds: [2, 15],
} as const;

/** Whatever was kept (maybe by an older build, maybe edited by hand), made safe to use. */
export const cleanSettings = (raw: unknown): Settings => {
  const kept = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const seconds = (key: keyof typeof SETTING_LIMITS): number => {
    const value = kept[key];
    const [lo, hi] = SETTING_LIMITS[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? clamp(Math.round(value), lo, hi)
      : DEFAULT_SETTINGS[key];
  };
  return {
    photoSeconds: seconds('photoSeconds'),
    flightSeconds: seconds('flightSeconds'),
    slideSeconds: seconds('slideSeconds'),
    help: typeof kept.help === 'boolean' ? kept.help : DEFAULT_SETTINGS.help,
  };
};

export const settingsStore = createStore<Settings>(cleanSettings(readJSON<unknown>('settings', {})));

settingsStore.subscribe(() => writeJSON('settings', settingsStore.get()));
