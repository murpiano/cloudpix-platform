import { MONTHS } from '@/lib/dates';
import { clamp } from '@/lib/math';

/** A stretch of the timeline in fractional years; `year` when it is a whole year. */
export interface Range {
  lo: number;
  hi: number;
  year?: number;
}

/** Floating-point slack only: one minute on the timeline is about 1.9e-6 of a year. */
const EPS = 1e-9;

/** An album's place on the timeline: its month, and within the month its day and time. */
export const albumTime = ({
  year,
  month,
  day,
  time,
}: {
  year: number;
  month: number;
  day: number;
  time: string;
}): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return year + (month - 1 + (day - 1 + (hours * 60 + minutes) / 1440) / 31) / 12;
};

export const within = (t: number, range: Range | null): boolean =>
  range === null || (t >= range.lo - EPS && t <= range.hi + EPS);

/** A whole year; it ends clear of the tolerance, so 1 January of the next year stays out. */
export const yearRange = (year: number): Range => ({ lo: year, hi: year + 1 - 10 * EPS, year });

/** The whole years the timeline shows: from the first album's year to after the last one's. */
export const span = (times: readonly number[]): [number, number] =>
  times.length === 0
    ? [2000, 2001]
    : [Math.floor(Math.min(...times)), Math.floor(Math.max(...times)) + 1];

/** A drag picks the stretch; a plain click picks everything from the start up to that point. */
export const pickedRange = (start: number, end: number, moved: boolean, first: number): Range =>
  moved ? { lo: Math.min(start, end), hi: Math.max(start, end) } : { lo: first, hi: end };

/**
 * The time under `x` px of a track `width` px wide. Within `snapPx` of an album it lands on that
 * album, so both ends of a range are easy to hit.
 */
export const timeAt = (
  x: number,
  width: number,
  times: readonly number[],
  [y0, y1]: [number, number],
  snapPx = 10,
): number => {
  let best: number | null = null;
  let bestDistance = snapPx;
  for (const t of times) {
    const distance = Math.abs(((t - y0) / (y1 - y0)) * width - x);
    if (distance < bestDistance) {
      best = t;
      bestDistance = distance;
    }
  }
  return best ?? clamp(y0 + (x / width) * (y1 - y0), y0, y1);
};

export const nearestIndex = (t: number, times: readonly number[]): number => {
  let best = 0;
  let bestDistance = Infinity;
  times.forEach((time, index) => {
    const distance = Math.abs(time - t);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

export interface Progress {
  /** Off after a new range is picked, until the plane moves again. */
  on: boolean;
  /** Album index in focus, -1 for none. */
  focus: number;
  /** The plane is still on its way to the album in focus. */
  ahead: boolean;
  range: Range | null;
}

/** Reached: on the timeline up to the album in focus, from the start of the picked range. */
export const isReached = (index: number, time: number, { on, focus, ahead, range }: Progress): boolean => {
  if (!on || focus < 0) return false;
  if (index > (ahead ? focus - 1 : focus)) return false;
  return range === null || time >= range.lo - EPS;
};

export const stamp = (t: number): string => {
  const year = Math.floor(t + 1e-9);
  return `${MONTHS[clamp(Math.floor((t - year) * 12), 0, 11)] ?? ''} ${year}`;
};

export const rangeLabel = ({ lo, hi, year }: Range): string =>
  year !== undefined ? String(year) : lo === hi ? stamp(lo) : `${stamp(lo)} – ${stamp(hi)}`;
