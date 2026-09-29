/** A small deterministic generator (Park–Miller), so stars and lights look the same on every visit. */
export const seeded = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
};
