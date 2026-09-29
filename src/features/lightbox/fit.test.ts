import { describe, expect, it } from 'vitest';
import { fitRect, flyTransform } from './fit';

describe('fitRect', () => {
  it('fits a wide photo to the width, centred', () => {
    expect(fitRect({ x: 100, y: 50, width: 800, height: 600 }, 2)).toEqual({
      x: 100,
      y: 150,
      width: 800,
      height: 400,
    });
  });

  it('fits a tall photo to the height, centred', () => {
    expect(fitRect({ x: 0, y: 0, width: 800, height: 600 }, 0.5)).toEqual({
      x: 250,
      y: 0,
      width: 300,
      height: 600,
    });
  });
});

describe('flyTransform', () => {
  it('moves and scales a box onto another from its top-left corner', () => {
    expect(
      flyTransform({ x: 100, y: 100, width: 400, height: 200 }, { x: 10, y: 20, width: 200, height: 50 }),
    ).toBe('translate(-90px, -80px) scale(0.5, 0.25)');
  });
});
