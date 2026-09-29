/** How many slides show either side of the one in front: the row is 2 * REACH + 1 long. */
export const REACH = 2;

/** The photo at a position of the loop, where positions run on for ever both ways. */
export const indexAt = (position: number, count: number): number =>
  ((position % count) + count) % count;

/**
 * How many positions the loop moved when the photo went from `from` to `to` in the direction `dir`
 * (1 forward, -1 back): the long way round for a step from the last photo to the first, never a
 * jump back across the album.
 */
export const stepDelta = (from: number, to: number, count: number, dir: -1 | 0 | 1): number => {
  if (from === to || count < 2) return 0;
  const forward = (((to - from) % count) + count) % count;
  return dir < 0 ? forward - count : forward;
};

/**
 * The positions of the slides to draw round `position`. Each slide is keyed by its position, so
 * turning the page only moves the slides that are there, and a slide that comes in does so out of
 * sight. A single photo has no neighbours.
 */
export const slidePositions = (position: number, count: number): number[] => {
  if (count < 2) return [position];
  const positions: number[] = [];
  for (let at = position - REACH; at <= position + REACH; at += 1) positions.push(at);
  return positions;
};
