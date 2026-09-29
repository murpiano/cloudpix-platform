/** The plane is under the album cards on a phone above this y (px). */
const COVER_Y = 300;
/** It has to be this far below that line before the cards move back up, so they do not flicker. */
const RELEASE_Y = 360;

/**
 * Whether the album cards sit at the bottom of a phone screen, given the y of what the eye follows:
 * the plane in the air, the place it landed at once it is down. With nothing to follow the cards stay
 * where they are.
 */
export const albumsLow = (low: boolean, y: number | null): boolean => {
  if (y === null) return low;
  return y < COVER_Y || (low && y < RELEASE_Y);
};
