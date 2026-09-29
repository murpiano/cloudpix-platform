import { clamp, DEG } from '@/lib/math';
import { FRAME_MS } from './clock';

/** Cumulative drag in degrees at a moment. */
export interface DragSample {
  at: number;
  x: number;
  y: number;
}

/** The throw is measured over the last ~160 ms of movement. */
export const THROW_WINDOW = 160;
/** A hand that rests this long before letting go does not throw. */
export const THROW_MAX_IDLE = 220;
/** Fastest throw, in degrees per 60 Hz frame. */
export const THROW_MAX = 6;

export const pushSample = (samples: DragSample[], sample: DragSample): void => {
  samples.push(sample);
  while (samples.length > 2 && sample.at - (samples[0]?.at ?? sample.at) > THROW_WINDOW) {
    samples.shift();
  }
};

/** Throw speed in degrees per 60 Hz frame, about the screen axes. */
export const throwVelocity = (samples: DragSample[], now: number): [number, number] => {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || samples.length < 2 || now - last.at >= THROW_MAX_IDLE) {
    return [0, 0];
  }
  const span = Math.max(last.at - first.at, 1);
  return [
    clamp(((last.x - first.x) / span) * FRAME_MS, -THROW_MAX, THROW_MAX),
    clamp(((last.y - first.y) / span) * FRAME_MS, -THROW_MAX, THROW_MAX),
  ];
};

/**
 * A sideways throw sets the Earth spinning the same way; upside down (γ past ±90°) its axis turns
 * the other way. A soft or vertical throw keeps the current way.
 */
export const spinDirection = (vx: number, vy: number, gam: number, current: 1 | -1): 1 | -1 => {
  if (Math.hypot(vx, vy) <= 0.12 || Math.abs(vx) <= 0.05) return current;
  const upsideDown = Math.cos(gam * DEG) < 0;
  return (Math.sign(vx) * (upsideDown ? -1 : 1)) as 1 | -1;
};
