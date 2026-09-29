export type CardRole = 'cur' | 'prev' | 'next' | 'far';

/** Albums go by date in a loop: after the last comes the first. */
export const cardRole = (k: number, cur: number, n: number): CardRole => {
  let offset = (((k - cur) % n) + n) % n;
  if (offset > n / 2) offset -= n;
  return offset === 0 ? 'cur' : offset === -1 ? 'prev' : offset === 1 ? 'next' : 'far';
};

/**
 * The wheel over the albums: one album per notch (100 px), a quick double turn moves two.
 * Returns the new accumulated delta and the albums to move.
 */
export const wheelSteps = (acc: number, deltaY: number, deltaMode: number): [number, number] => {
  const pixels = deltaMode === 1 ? deltaY * 33 : deltaMode === 2 ? deltaY * 400 : deltaY;
  const next = acc + pixels;
  if (Math.abs(next) < 50) return [next, 0];
  return [0, Math.sign(next) * Math.max(1, Math.round(Math.abs(next) / 100))];
};
