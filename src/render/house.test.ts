import { describe, expect, it } from 'vitest';
import { createSmoke, GLASS, HOUSE, ROOF, stepSmoke } from './house';

/** Runs the smoke for `ms` in 60 Hz frames. */
const run = (smoke: ReturnType<typeof createSmoke>, ms: number, lit: number) => {
  for (let t = 0; t < ms; t += 16.7) stepSmoke(smoke, 16.7, lit, () => 0.5);
};

describe('HOUSE', () => {
  it('has walls, a roof, a chimney and a 2×2 window', () => {
    expect(HOUSE.parts).toHaveLength(14);
    expect(HOUSE.parts.filter((part) => part.fill === GLASS)).toHaveLength(4);
    expect(HOUSE.parts.filter((part) => part.fill === ROOF)).toHaveLength(1);
  });

  it('draws closed paths only', () => {
    for (const part of HOUSE.parts) expect(part.d).toMatch(/^M.*Z$/);
  });

  it('puts the chimney above the foot of the house', () => {
    expect(HOUSE.chimney[1]).toBeLessThan(HOUSE.oy);
  });
});

describe('smoke', () => {
  it('rises only while someone is home', () => {
    const smoke = createSmoke();
    run(smoke, 2000, 0.3);
    expect(smoke.puffs).toHaveLength(0);
    run(smoke, 1000, 1);
    expect(smoke.puffs.length).toBeGreaterThan(4);
  });

  it('stops when the light goes out, and the last puffs fade away', () => {
    const smoke = createSmoke();
    run(smoke, 1000, 1);
    run(smoke, 3700, 0);
    expect(smoke.puffs).toHaveLength(0);
  });

  it('waits while the world is paused', () => {
    const smoke = createSmoke();
    run(smoke, 500, 1);
    const ages = smoke.puffs.map((puff) => puff.age);
    stepSmoke(smoke, 0, 1, () => 0.5);
    expect(smoke.puffs.map((puff) => puff.age)).toEqual(ages);
  });
});
