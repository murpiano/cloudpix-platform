import type { AppState } from '@/state/app-state';

/** A year or trip tour that ended by itself brings its archive page back after this long. */
export const RETURN_DELAY_MS = 5000;
/** How slowly the archive fades back in. */
export const SLOW_FADE_MS = 1400;

export type TourOutcome = 'finished' | 'interrupted' | null;

/** Between two states: did a tour end by itself, did the owner stop or leave it, or neither. */
export const tourOutcome = (prev: AppState, next: AppState): TourOutcome => {
  if (next.tourDone !== prev.tourDone) return 'finished';
  if ((prev.tour && !next.tour) || (prev.playing && !next.playing)) return 'interrupted';
  return null;
};
