import type { AppState } from '@/state/app-state';

/** A year or trip tour that ended by itself brings its archive page back after this long. */
export const RETURN_DELAY_MS = 5000;
/** How slowly the archive fades back in. */
export const SLOW_FADE_MS = 1400;

export type ReturnStep = 'arm' | 'cancel' | null;

/**
 * What a state change means for the return to the archive. While the tour plays (`armed` false),
 * only the owner stopping or leaving it cancels; once it has ended by itself and the return is
 * armed, anything the owner starts next (play again, another place, a range, letting go) does.
 */
export const returnStep = (armed: boolean, prev: AppState, next: AppState): ReturnStep => {
  if (next.tourDone !== prev.tourDone) return 'arm';
  const stopped = (prev.tour !== null && next.tour === null) || (prev.playing && !next.playing);
  if (!armed) return stopped ? 'cancel' : null;
  const moved =
    next.playing !== prev.playing ||
    next.tour !== prev.tour ||
    next.focus !== prev.focus ||
    next.range !== prev.range ||
    next.picking !== prev.picking ||
    next.endCard !== prev.endCard;
  return moved ? 'cancel' : null;
};
