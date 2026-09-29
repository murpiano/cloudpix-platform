import { describe, expect, it } from 'vitest';
import { nextSpinning, pushSample, spinDirection, THROW_MAX, throwVelocity } from './throw';
import type { DragSample } from './throw';

describe('pushSample', () => {
  it('keeps only the last ~160 ms, and at least two samples', () => {
    const samples: DragSample[] = [];
    for (let at = 0; at <= 1000; at += 20) pushSample(samples, { at, x: at, y: 0 });
    expect(samples[0]?.at).toBeGreaterThanOrEqual(1000 - 160);
    const two: DragSample[] = [];
    pushSample(two, { at: 0, x: 0, y: 0 });
    pushSample(two, { at: 500, x: 1, y: 0 });
    expect(two).toHaveLength(2);
  });
});

describe('throwVelocity', () => {
  it('turns the last movement into degrees per 60 Hz frame', () => {
    const samples: DragSample[] = [
      { at: 0, x: 0, y: 0 },
      { at: 100, x: 10, y: -5 },
    ];
    const [vx, vy] = throwVelocity(samples, 110);
    expect(vx).toBeCloseTo(1.67);
    expect(vy).toBeCloseTo(-0.835);
  });

  it('does not throw when the hand rested before letting go', () => {
    const samples: DragSample[] = [
      { at: 0, x: 0, y: 0 },
      { at: 100, x: 10, y: 0 },
    ];
    expect(throwVelocity(samples, 100 + 220)).toEqual([0, 0]);
  });

  it('caps a wild throw', () => {
    const samples: DragSample[] = [
      { at: 0, x: 0, y: 0 },
      { at: 10, x: 500, y: -500 },
    ];
    expect(throwVelocity(samples, 10)).toEqual([THROW_MAX, -THROW_MAX]);
  });

  it('needs two samples', () => {
    expect(throwVelocity([], 0)).toEqual([0, 0]);
    expect(throwVelocity([{ at: 0, x: 3, y: 3 }], 0)).toEqual([0, 0]);
  });
});

describe('spinDirection', () => {
  it('follows a sideways throw', () => {
    expect(spinDirection(-2, 0, 0, 1)).toBe(-1);
    expect(spinDirection(2, 0, 0, -1)).toBe(1);
  });

  it('turns the other way when the globe is upside down', () => {
    expect(spinDirection(2, 0, 180, 1)).toBe(-1);
  });

  it('keeps its way after a soft or vertical throw', () => {
    expect(spinDirection(0.05, 0.05, 0, -1)).toBe(-1);
    expect(spinDirection(0.01, 3, 0, -1)).toBe(-1);
  });
});

describe('nextSpinning', () => {
  it('stops a thrown spin when a flight takes the camera, so the landing stays put', () => {
    // thrown while a place is in focus: spinning; then a flight steers the camera
    expect(nextSpinning({ spinning: true, focused: true, wasFocused: true, steering: true })).toBe(
      false,
    );
  });

  it('stops for a new focus and starts again when the focus goes', () => {
    expect(nextSpinning({ spinning: true, focused: true, wasFocused: false, steering: false })).toBe(
      false,
    );
    expect(nextSpinning({ spinning: false, focused: false, wasFocused: true, steering: false })).toBe(
      true,
    );
  });

  it('keeps a thrown spin while nothing steers', () => {
    expect(nextSpinning({ spinning: true, focused: true, wasFocused: true, steering: false })).toBe(
      true,
    );
  });
});
