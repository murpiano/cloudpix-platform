/** Smoothstep: zero speed at both ends. */
export const smooth = (x: number): number => x * x * (3 - 2 * x);

/** Smootherstep: zero speed and zero acceleration at both ends. */
export const smoother = (x: number): number => x * x * x * (x * (x * 6 - 15) + 10);

/**
 * Moves `value` toward `target` at the same pace at any frame rate. `f` is the frame length in
 * 60 Hz frames; each 60 Hz frame keeps `k` of the remaining gap.
 */
export const ease = (value: number, target: number, f: number, k: number): number =>
  value + (target - value) * (1 - k ** f);

/** One soft pulse over `duration` ms: 0 → 1 → 0 as a raised cosine, with no jolt at either end. */
export const pulse = (since: number, duration: number): number =>
  since >= 0 && since < duration ? (1 - Math.cos((2 * Math.PI * since) / duration)) / 2 : 0;
