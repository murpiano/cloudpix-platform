import { describe, expect, it } from 'vitest';
import { tickInterval } from './interval';

describe('tickInterval', () => {
  it('fires once the time is up and starts over', () => {
    expect(tickInterval(0, 1000, 2000)).toEqual([1000, false]);
    expect(tickInterval(1000, 1000, 2000)).toEqual([0, true]);
  });

  it('stands still while the world is paused', () => {
    expect(tickInterval(1500, 0, 2000)).toEqual([1500, false]);
  });
});
