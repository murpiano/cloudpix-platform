/** The plane is under the album cards on a phone above this y (px). */
const COVER_Y = 300;
/** It has to be this far below that line before the cards move back up, so they do not flicker. */
const RELEASE_Y = 360;

/** Whether the album cards sit at the bottom of a phone screen, given where the plane is drawn. */
export const albumsLow = (low: boolean, planeY: number | null): boolean => {
  if (planeY === null) return false;
  return planeY < COVER_Y || (low && planeY < RELEASE_Y);
};
