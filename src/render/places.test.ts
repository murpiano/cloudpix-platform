import { describe, expect, it } from 'vitest';
import { HOVER_GLOW, PLACE_LOOK, placeState, stepLook } from './places';
import type { PlaceFacts } from './places';

const facts = (patch: Partial<PlaceFacts>): PlaceFacts => ({
  focused: false,
  reached: false,
  inRange: false,
  rangeActive: false,
  ...patch,
});

describe('placeState', () => {
  it('is plain when nothing is active on the timeline', () => {
    expect(placeState(facts({}))).toBe('plain');
  });

  it('is grey outside a picked range', () => {
    expect(placeState(facts({ rangeActive: true }))).toBe('grey');
  });

  it('is blue inside the range until reached', () => {
    expect(placeState(facts({ rangeActive: true, inRange: true }))).toBe('blue');
  });

  it('is yellow once reached', () => {
    expect(placeState(facts({ rangeActive: true, inRange: true, reached: true }))).toBe('yellow');
    expect(placeState(facts({ reached: true }))).toBe('yellow');
  });

  it('is current when in focus, whatever else holds', () => {
    expect(placeState({ focused: true, reached: true, inRange: true, rangeActive: true })).toBe(
      'current',
    );
  });
});

describe('PLACE_LOOK', () => {
  it('makes the current place the brightest and 1.45× bigger', () => {
    expect(PLACE_LOOK.current.size).toBe(1.45);
    for (const look of Object.values(PLACE_LOOK)) {
      expect(PLACE_LOOK.current.glow).toBeGreaterThanOrEqual(look.glow);
    }
  });

  it('gives a plain place no glow', () => {
    expect(PLACE_LOOK.plain.glow).toBe(0);
  });
});

describe('stepLook', () => {
  it('fades most of the way in about 0.4 s', () => {
    let look = PLACE_LOOK.plain;
    for (let frame = 0; frame < 24; frame++) look = stepLook(look, 'blue', 1, false);
    expect(look.blue).toBeGreaterThan(0.9);
    expect(look.blue).toBeLessThan(1);
  });

  it('adds a little glow under the cursor, never past full', () => {
    let look = PLACE_LOOK.plain;
    for (let frame = 0; frame < 200; frame++) look = stepLook(look, 'plain', 1, true);
    expect(look.glow).toBeCloseTo(HOVER_GLOW);
    let current = PLACE_LOOK.current;
    for (let frame = 0; frame < 200; frame++) current = stepLook(current, 'current', 1, true);
    expect(current.glow).toBeCloseTo(1);
  });
});
