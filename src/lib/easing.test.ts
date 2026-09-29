import { describe, expect, it } from 'vitest';
import { ease, pulse, smooth, smoother } from './easing';

describe('smooth and smoother', () => {
  it('run from 0 to 1 through the middle', () => {
    for (const curve of [smooth, smoother]) {
      expect(curve(0)).toBe(0);
      expect(curve(0.5)).toBeCloseTo(0.5);
      expect(curve(1)).toBe(1);
    }
  });
});

describe('ease', () => {
  it('does not depend on the frame rate', () => {
    let at60 = 0;
    for (let i = 0; i < 60; i++) at60 = ease(at60, 1, 1, 0.9);
    let at30 = 0;
    for (let i = 0; i < 30; i++) at30 = ease(at30, 1, 2, 0.9);
    expect(at60).toBeCloseTo(at30, 10);
  });

  it('stays put when no time passes', () => {
    expect(ease(0.3, 1, 0, 0.9)).toBe(0.3);
  });
});

describe('pulse', () => {
  it('starts and ends at rest and peaks in the middle', () => {
    expect(pulse(0, 1500)).toBe(0);
    expect(pulse(750, 1500)).toBeCloseTo(1);
    expect(pulse(1500, 1500)).toBe(0);
    expect(pulse(-1, 1500)).toBe(0);
    expect(pulse(-Infinity, 1500)).toBe(0);
  });

  it('has no jolt at either end', () => {
    expect(pulse(15, 1500)).toBeLessThan(0.002);
    expect(pulse(1485, 1500)).toBeLessThan(0.002);
  });
});
