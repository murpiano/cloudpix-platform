import { clamp } from '@/lib/math';

/** One 60 Hz frame in ms: every per-frame rate in the engine is written for it. */
export const FRAME_MS = 16.7;
/** The longest step the world takes in one frame, so a tab back from the background does not jump. */
export const MAX_STEP_MS = 70;

export interface Step {
  /** Real ms since the last frame. */
  real: number;
  /** World ms: none while the world is paused. */
  dt: number;
  /** `dt` in 60 Hz frames. */
  f: number;
}

export const frameStep = (time: number, last: number | null, paused: boolean): Step => {
  const real = last === null ? FRAME_MS : clamp(time - last, 0, MAX_STEP_MS);
  const dt = paused ? 0 : real;
  return { real, dt, f: dt / FRAME_MS };
};
