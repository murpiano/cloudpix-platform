import { describe, expect, it } from 'vitest';
import { swipeStep } from './swipe';

describe('swipeStep', () => {
  it('goes to the next frame when the finger moves left', () => {
    expect(swipeStep(-120, 10, 400)).toBe(1);
  });

  it('goes to the previous frame when the finger moves right', () => {
    expect(swipeStep(120, -8, 400)).toBe(-1);
  });

  it('accepts a short but quick flick', () => {
    expect(swipeStep(-30, 2, 40)).toBe(1);
  });

  it('ignores a short slow drag', () => {
    expect(swipeStep(-30, 2, 400)).toBe(0);
  });

  it('ignores mostly vertical movement, which is page scrolling', () => {
    expect(swipeStep(-90, 110, 300)).toBe(0);
  });

  it('ignores a tap', () => {
    expect(swipeStep(0, 0, 90)).toBe(0);
  });
});
