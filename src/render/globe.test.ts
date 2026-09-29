import { describe, expect, it } from 'vitest';
import { placeBase, placeRadius } from './globe';
import type { PlaceSprite } from './globe';
import { PLACE_LOOK } from './places';

const sprite = (patch: Partial<PlaceSprite>): PlaceSprite => ({
  x: 0,
  y: 0,
  look: PLACE_LOOK.yellow,
  pulse: 0,
  photos: 100,
  ...patch,
});

describe('placeBase', () => {
  it('grows with the globe inside limits', () => {
    expect(placeBase(38)).toBe(0.6);
    expect(placeBase(380)).toBe(1);
    expect(placeBase(3800)).toBe(2);
  });
});

describe('placeRadius', () => {
  it('grows with the photos of a place', () => {
    expect(placeRadius(sprite({ photos: 400 }), 1)).toBeGreaterThan(placeRadius(sprite({}), 1));
  });

  it('makes the current place 1.45× the size of a reached one', () => {
    const current = placeRadius(sprite({ look: PLACE_LOOK.current }), 1);
    expect(current / placeRadius(sprite({}), 1)).toBeCloseTo(1.45);
  });

  it('swells with the pulse', () => {
    expect(placeRadius(sprite({ pulse: 1 }), 1) / placeRadius(sprite({}), 1)).toBeCloseTo(1.8);
  });
});
