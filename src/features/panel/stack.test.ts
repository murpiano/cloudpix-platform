import { describe, expect, it } from 'vitest';
import { cardRole, wheelSteps } from './stack';

describe('cardRole', () => {
  it('puts the current album in front with its neighbours around it, in a loop', () => {
    expect([0, 1, 2, 3, 4].map((k) => cardRole(k, 0, 5))).toEqual([
      'cur',
      'next',
      'far',
      'far',
      'prev',
    ]);
    expect([0, 1].map((k) => cardRole(k, 1, 2))).toEqual(['next', 'cur']);
    expect(cardRole(0, 0, 1)).toBe('cur');
  });
});

describe('wheelSteps', () => {
  it('moves one album per notch', () => {
    expect(wheelSteps(0, 100, 0)).toEqual([0, 1]);
    expect(wheelSteps(0, -100, 0)).toEqual([0, -1]);
  });

  it('gathers small trackpad deltas into one step, never a jump', () => {
    let acc = 0;
    let moved = 0;
    for (let i = 0; i < 20; i++) {
      const [next, steps] = wheelSteps(acc, 5, 0);
      acc = next;
      moved += steps;
    }
    expect(moved).toBe(2);
  });

  it('reads line and page deltas as pixels', () => {
    expect(wheelSteps(0, 3, 1)[1]).toBe(1);
    expect(wheelSteps(0, 1, 2)[1]).toBe(4);
  });
});
