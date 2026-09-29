import { describe, expect, it } from 'vitest';
import { seeded } from './random';

describe('seeded', () => {
  it('repeats the same numbers for the same seed', () => {
    const a = seeded(11);
    const b = seeded(11);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays inside (0, 1)', () => {
    const random = seeded(3);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
  });
});
