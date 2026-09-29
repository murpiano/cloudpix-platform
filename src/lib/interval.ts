/** A repeating timer on the world clock: returns the new elapsed time and whether it fired. */
export const tickInterval = (elapsed: number, dt: number, ms: number): [number, boolean] => {
  const next = elapsed + dt;
  return next >= ms ? [0, true] : [next, false];
};
