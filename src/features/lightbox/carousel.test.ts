import { describe, expect, it } from 'vitest';
import { indexAt, slidePositions, stepDelta } from './carousel';

describe('indexAt', () => {
  it('wraps any position onto the photos, forwards and backwards', () => {
    expect(indexAt(0, 5)).toBe(0);
    expect(indexAt(7, 5)).toBe(2);
    expect(indexAt(-1, 5)).toBe(4);
    expect(indexAt(-11, 5)).toBe(4);
  });
});

describe('stepDelta', () => {
  it('moves one step in the direction of the turn', () => {
    expect(stepDelta(2, 3, 6, 1)).toBe(1);
    expect(stepDelta(3, 2, 6, -1)).toBe(-1);
  });

  it('goes on round the loop instead of jumping back across the album', () => {
    expect(stepDelta(5, 0, 6, 1)).toBe(1);
    expect(stepDelta(0, 5, 6, -1)).toBe(-1);
  });

  it('covers a jump of several photos in the direction it was made', () => {
    expect(stepDelta(1, 3, 6, 1)).toBe(2);
    expect(stepDelta(3, 1, 6, -1)).toBe(-2);
  });

  it('is nothing when the photo did not change', () => {
    expect(stepDelta(2, 2, 6, 1)).toBe(0);
  });
});

describe('slidePositions', () => {
  it('lists the slides two either side of the one in front, each once', () => {
    expect(slidePositions(4, 10)).toEqual([2, 3, 4, 5, 6]);
  });

  it('keeps them apart even when the album is shorter than the row, so none is moved to another side', () => {
    const positions = slidePositions(1, 2);
    expect(new Set(positions).size).toBe(positions.length);
    expect(positions).toContain(1);
  });

  it('has just the one slide for a single photo', () => {
    expect(slidePositions(0, 1)).toEqual([0]);
  });
});
