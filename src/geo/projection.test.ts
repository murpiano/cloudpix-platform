import { describe, expect, it } from 'vitest';
import { DEG } from '@/lib/math';
import {
  clipCos,
  clipKind,
  createBlendProjection,
  faces,
  flatLatLimit,
  NOTCH,
  raw,
  ROLLED,
  stepUnroll,
  UNROLL_MS,
  unrollT,
  zFlat,
} from './projection';
import type { Viewport } from './projection';
import { vec } from './vector';

describe('clip choice', () => {
  it('is a circle on the ball, circle and seam while unrolling, seam alone from t = .5', () => {
    expect(clipKind(0)).toBe('circle');
    expect(clipKind(0.25)).toBe('circle+antimeridian');
    expect(clipKind(0.49)).toBe('circle+antimeridian');
    expect(clipKind(0.5)).toBe('antimeridian');
    expect(clipKind(1)).toBe('antimeridian');
  });

  it('opens the circle as the ball unrolls', () => {
    expect(clipCos(0)).toBe(0);
    expect(clipCos(0.25)).toBeCloseTo(-1 / 3);
    expect(clipCos(0.5)).toBe(-1);
  });
});

describe('unroll without folds', () => {
  const steps = 400;

  it('never folds inside the clip', () => {
    for (const t of [0.1, 0.25, 0.4, 0.49]) {
      const limit = Math.acos(clipCos(t)) - 1e-3;
      let lastX = -Infinity;
      let lastY = -Infinity;
      for (let i = 0; i <= steps; i++) {
        const a = (limit * i) / steps;
        const [x] = raw(t, a, 0);
        const [, y] = raw(t, 0, Math.min(a, Math.PI / 2));
        expect(x).toBeGreaterThan(lastX);
        expect(y).toBeGreaterThanOrEqual(lastY);
        lastX = x;
        lastY = y;
      }
    }
  });

  it('would fold just past the clip, so the clip is tight', () => {
    for (const t of [0.1, 0.25, 0.4]) {
      const limit = Math.acos(clipCos(t));
      expect(raw(t, limit + 0.05, 0)[0]).toBeLessThan(raw(t, limit, 0)[0]);
    }
  });

  it('never folds from t = .5 on', () => {
    for (const t of [0.5, 0.75, 1]) {
      let lastX = -Infinity;
      for (let i = -steps; i <= steps; i++) {
        const [x] = raw(t, (Math.PI * i) / (steps + 1), 0);
        expect(x).toBeGreaterThan(lastX);
        lastX = x;
      }
    }
  });
});

describe('faces', () => {
  const centre = vec(0, 0);

  it('hides what is behind the ball', () => {
    expect(faces(vec(10, 10), centre, 0, 0.02)).toBe(true);
    expect(faces(vec(120, 0), centre, 0, 0.02)).toBe(false);
    expect(faces(vec(89.5, 0), centre, 0, 0.02)).toBe(false);
  });

  it('shows everything on the flat map, the far edges too', () => {
    expect(faces(vec(179, 0), centre, 1, 0.03)).toBe(true);
    expect(faces(vec(-179, 5), centre, 0.5, 0.03)).toBe(true);
  });
});

describe('createBlendProjection', () => {
  it('follows the blend', () => {
    const { projection, blend } = createBlendProjection();
    projection.scale(1).translate([0, 0]).rotate([0, 0, 0]);
    blend(0);
    expect(projection([90, 0])?.[0]).toBeCloseTo(1);
    blend(1);
    expect(projection([90, 0])?.[0]).toBeCloseTo(Math.PI / 2);
  });
});

describe('zFlat', () => {
  it('sits three notches before the ball would touch the screen edge', () => {
    const viewport: Viewport = { width: 2000, height: 2000, cx: 1000, cy: 1000, r0: 300 };
    expect(zFlat(viewport) * viewport.r0 * NOTCH ** 3).toBeCloseTo(1000);
  });

  it('is never at the resting size', () => {
    const laptop: Viewport = { width: 1440, height: 900, cx: 864, cy: 450, r0: 360 };
    expect(zFlat(laptop)).toBeGreaterThanOrEqual(1.05);
  });

  it('leaves no gap around the flat map on a 390 × 844 phone', () => {
    const phone: Viewport = { width: 390, height: 844, cx: 195, cy: 844 * 0.58, r0: 156 };
    const r = zFlat(phone) * phone.r0;
    expect(Math.PI * r).toBeGreaterThanOrEqual(Math.max(phone.cx, phone.width - phone.cx));
    expect((Math.PI / 2) * r).toBeGreaterThanOrEqual(Math.max(phone.cy, phone.height - phone.cy));
  });
});

describe('unroll', () => {
  const zf = 1.4;

  it('rests as a ball', () => {
    expect(unrollT(ROLLED, 0)).toBe(0);
  });

  it('unrolls and rolls back at the very same notch', () => {
    const at = stepUnroll(ROLLED, 0, zf, zf, 1000);
    expect(at.flat).toBe(true);
    expect(stepUnroll(ROLLED, 0, zf - 1e-9, zf, 1000).flat).toBe(false);
    expect(stepUnroll(at, 1, zf, zf, 5000).flat).toBe(true);
    expect(stepUnroll(at, 1, zf - 1e-9, zf, 5000).flat).toBe(false);
  });

  it('takes 1.1 s to unroll', () => {
    const at = stepUnroll(ROLLED, 0, zf, zf, 1000);
    expect(unrollT(at, 1000)).toBe(0);
    expect(unrollT(at, 1000 + UNROLL_MS / 2)).toBeCloseTo(0.5);
    expect(unrollT(at, 1000 + UNROLL_MS)).toBe(1);
  });

  it('turns around from where it is when reversed halfway', () => {
    const going = stepUnroll(ROLLED, 0, zf, zf, 0);
    const t = unrollT(going, 300);
    const back = stepUnroll(going, t, zf - 0.1, zf, 300);
    expect(unrollT(back, 300)).toBeCloseTo(t);
    expect(unrollT(back, 300 + UNROLL_MS)).toBe(0);
  });

  it('does not flip back and forth while the zoom target rests on the notch', () => {
    let unroll = stepUnroll(ROLLED, 0, zf, zf, 0);
    for (let now = 16; now < 3000; now += 16) {
      const next = stepUnroll(unroll, unrollT(unroll, now), zf, zf, now);
      expect(next).toBe(unroll);
      unroll = next;
    }
  });
});

describe('flatLatLimit', () => {
  it('keeps the world edge off screen', () => {
    expect(flatLatLimit(450, 900, 1000)).toBeCloseTo(90 - 450 / 1000 / DEG);
    expect(flatLatLimit(450, 900, 100)).toBe(0);
  });
});
