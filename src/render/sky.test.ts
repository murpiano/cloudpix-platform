import { describe, expect, it } from 'vitest';
import { createSky, starDrift, stepSky } from './sky';

/** A random source that returns the given values in turn, then 0.5. */
const queue =
  (...values: number[]) =>
  () =>
    values.shift() ?? 0.5;

describe('createSky', () => {
  it('twinkles about 30 stars, fewer on a phone', () => {
    expect(createSky(1440, 900, false).twinklers).toHaveLength(34);
    expect(createSky(390, 844, true).twinklers).toHaveLength(18);
  });

  it('is the same on every visit', () => {
    expect(createSky(800, 600, false)).toEqual(createSky(800, 600, false));
  });
});

describe('stepSky', () => {
  it('waits before the first event', () => {
    const sky = createSky(800, 600, false);
    stepSky(sky, 4900, queue());
    expect(sky.events).toHaveLength(0);
  });

  it('sends a slow meteor and schedules the next event 7–20 s later', () => {
    const sky = createSky(800, 600, false);
    // next interval, then kind: below .6 is a meteor
    stepSky(sky, 5000, queue(0, 0.1));
    expect(sky.events).toHaveLength(1);
    const [meteor] = sky.events;
    expect(meteor?.kind).toBe('meteor');
    expect(meteor?.life).toBeGreaterThanOrEqual(2300);
    expect(meteor?.life).toBeLessThanOrEqual(3200);
    expect(sky.nextEventIn).toBe(7000);
  });

  it('sends a satellite that takes 16–24 s', () => {
    const sky = createSky(800, 600, false);
    stepSky(sky, 5000, queue(1, 0.9));
    const [satellite] = sky.events;
    expect(satellite?.kind).toBe('satellite');
    expect(satellite?.life).toBeGreaterThanOrEqual(16000);
    expect(satellite?.life).toBeLessThanOrEqual(24000);
    expect(sky.nextEventIn).toBe(20000);
  });

  it('lets an event go when its life is over', () => {
    const sky = createSky(800, 600, false);
    stepSky(sky, 5000, queue(1, 0.1));
    const life = sky.events[0]?.life ?? 0;
    stepSky(sky, life - 1, queue());
    expect(sky.events).toHaveLength(1);
    stepSky(sky, 2, queue());
    expect(sky.events).toHaveLength(0);
  });

  it('stands still while the world is paused', () => {
    const sky = createSky(800, 600, false);
    const before = sky.nextEventIn;
    stepSky(sky, 0, queue());
    expect(sky.nextEventIn).toBe(before);
  });
});

describe('starDrift', () => {
  it('drifts very slowly and only a few pixels', () => {
    const [x0, y0] = starDrift(0);
    const [x1, y1] = starDrift(1000);
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeLessThan(3);
    for (let now = 0; now < 400000; now += 5000) {
      const [x, y] = starDrift(now);
      expect(Math.abs(x)).toBeLessThanOrEqual(18);
      expect(Math.abs(y)).toBeLessThanOrEqual(12);
    }
  });
});
