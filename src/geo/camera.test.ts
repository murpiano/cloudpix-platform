import { geoDistance, geoOrthographic, geoRotation } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import { DEG } from '@/lib/math';
import { camCurve, euler, quat, RAMP, slerp, turn, twist, wrapLon } from './camera';
import type { Quat, Rotation } from './camera';
import { dot, vec } from './vector';

/** The lon/lat at the middle of the screen for a d3 rotation. */
const centre = (rot: Rotation) => geoRotation(rot).invert([0, 0]);
const degreesBetween = (a: Rotation, b: Rotation) => geoDistance(centre(a), centre(b)) / DEG;
const norm = (q: Quat) => Math.hypot(...q);

describe('vec and dot', () => {
  it('makes unit vectors on the sphere', () => {
    expect(dot(vec(30, 50), vec(30, 50))).toBeCloseTo(1);
    expect(dot(vec(0, 0), vec(90, 0))).toBeCloseTo(0);
    expect(dot(vec(0, 0), vec(180, 0))).toBeCloseTo(-1);
  });
});

describe('quaternions', () => {
  it('survive a round trip through euler angles', () => {
    const rotations: Rotation[] = [
      [-10, -35, 0],
      [120, 40, 15],
      [-170, -60, -30],
    ];
    for (const rot of rotations) {
      const back = euler(quat(rot));
      back.forEach((angle, i) => expect(angle).toBeCloseTo(rot[i] ?? NaN, 6));
    }
  });

  it('slerp starts at a, ends at b and stays a unit quaternion', () => {
    const a = quat([-10, -35, 0]);
    const b = quat([100, 20, 0]);
    slerp(a, b, 0).forEach((v, i) => expect(v).toBeCloseTo(a[i] ?? NaN));
    slerp(a, b, 1).forEach((v, i) => expect(v).toBeCloseTo(b[i] ?? NaN));
    expect(norm(slerp(a, b, 0.3))).toBeCloseTo(1);
  });

  it('slerp takes the short way when the signs differ', () => {
    const a = quat([0, 0, 0]);
    const b = quat([40, 0, 0]);
    const flipped: Quat = [-b[0], -b[1], -b[2], -b[3]];
    expect(degreesBetween(euler(slerp(a, flipped, 0.5)), [20, 0, 0])).toBeCloseTo(0, 4);
  });
});

describe('turn', () => {
  it('moves the middle of the screen by the dragged angle', () => {
    const start: Rotation = [-10, -35, 0];
    expect(degreesBetween(start, turn(start, 0, 20, 0))).toBeCloseTo(20, 4);
    expect(degreesBetween(start, turn(start, 20, 0, 0))).toBeCloseTo(20, 4);
  });

  it('goes over the pole without a jump', () => {
    // start off the exact pole crossing, where euler angles are degenerate
    let rot: Rotation = [0, -80.3, 0];
    let moved = 0;
    for (let i = 0; i < 40; i++) {
      const next = turn(rot, 0, 1, 0);
      moved += degreesBetween(rot, next);
      rot = next;
    }
    expect(moved).toBeCloseTo(40, 3);
    rot.forEach((angle) => expect(Number.isFinite(angle)).toBe(true));
  });

  it('comes back when the same moves are undone in reverse order', () => {
    // turns about two axes do not commute, so undo them last first
    const start: Rotation = [40, 10, 30];
    const there = turn(turn(start, 7, 0, 0), 0, -5, 0);
    const back = turn(turn(there, 0, 5, 0), -7, 0, 0);
    back.forEach((angle, i) => expect(angle).toBeCloseTo(start[i] ?? NaN, 6));
  });

  it('pans the flat map', () => {
    expect(turn([10, -20, 0], 5, 4, 1)).toEqual([15, -24, 0]);
  });

  it('keeps the longitude inside ±180', () => {
    expect(wrapLon(181)).toBe(-179);
    expect(wrapLon(-181)).toBe(179);
    expect(turn([178, 0, 0], 5, 0, 1)[0]).toBe(-177);
  });
});

describe('camCurve', () => {
  it('starts at 0 and ends at 1', () => {
    expect(camCurve(0)).toBe(0);
    expect(camCurve(1)).toBeCloseTo(1, 12);
  });

  it('is continuous where the ramps meet the cruise', () => {
    for (const edge of [RAMP, 1 - RAMP]) {
      expect(camCurve(edge + 1e-9)).toBeCloseTo(camCurve(edge - 1e-9), 6);
    }
  });

  it('never goes backwards', () => {
    let last = -1;
    for (let i = 0; i <= 1000; i++) {
      const value = camCurve(i / 1000);
      expect(value).toBeGreaterThanOrEqual(last);
      last = value;
    }
  });

  it('starts and stops with no jerk and cruises in the middle', () => {
    const h = 1e-4;
    expect((camCurve(h) - camCurve(0)) / h).toBeLessThan(0.01);
    expect((camCurve(1) - camCurve(1 - h)) / h).toBeLessThan(0.01);
    expect((camCurve(0.5 + h) - camCurve(0.5)) / h).toBeCloseTo(1 / (1 - RAMP), 4);
  });
});

describe('twist', () => {
  // where a point of the globe lands on the screen (y grows downwards)
  const onScreen = (rot: Rotation, lon: number, lat: number): [number, number] => {
    const at = geoOrthographic().scale(100).translate([0, 0]).rotate(rot).precision(0.1)([lon, lat]);
    if (!at) throw new Error('behind the globe');
    return at;
  };

  it('turns the globe clockwise about the view axis for a positive angle', () => {
    // the view is centred on (0, 0) as rotation [0, 0, 0]: a point above the centre goes right
    const before = onScreen([0, 0, 0], 0, 20);
    const after = onScreen(twist([0, 0, 0], 30, 0), 0, 20);
    expect(before[0]).toBeCloseTo(0, 5);
    expect(after[0]).toBeGreaterThan(5);
    expect(after[1]).toBeGreaterThan(before[1]);
  });

  it('keeps the point in the middle of the screen where it was', () => {
    const rot: Rotation = [-20, -35, 10];
    const middle = onScreen(rot, 20, 35);
    const after = onScreen(twist(rot, 40, 0), 20, 35);
    expect(after[0]).toBeCloseTo(middle[0], 4);
    expect(after[1]).toBeCloseTo(middle[1], 4);
  });

  it('does nothing on the flat map, where there is no axis to turn about', () => {
    expect(twist([-20, -35, 0], 40, 1)).toEqual([-20, -35, 0]);
  });

  it('is undone by turning back', () => {
    const start: Rotation = [-20, -35, 0];
    const back = twist(twist(start, 25, 0), -25, 0);
    back.forEach((angle, i) => expect(angle).toBeCloseTo(start[i] ?? 0, 4));
  });
});
