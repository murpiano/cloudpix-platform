import { describe, expect, it } from 'vitest';
import { depthAfterRotation, fibonacciSphere, orbitMetrics } from './layout';

describe('fibonacciSphere', () => {
  it('puts every point on the unit sphere', () => {
    for (const { x, y, z } of fibonacciSphere(19)) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6);
    }
  });

  it('runs from the north pole to the south pole', () => {
    const points = fibonacciSphere(21);
    expect(points[0]?.y).toBe(1);
    expect(points.at(-1)?.y).toBe(-1);
  });

  it('handles a single photo', () => {
    expect(fibonacciSphere(1)).toEqual([{ x: 1, y: 0, z: 0, lat: 0, lon: 90 }]);
  });
});

describe('orbitMetrics', () => {
  it('caps the radius on large screens', () => {
    expect(orbitMetrics(3840, 2160).radius).toBe(480);
  });

  it('keeps a floor on tiny screens', () => {
    const metrics = orbitMetrics(320, 200);
    expect(metrics.radius).toBe(108);
    expect(metrics.perspective).toBe(620);
    expect(metrics.cardWidth).toBe(72);
  });

  it('scales with the shorter axis on desktop', () => {
    expect(orbitMetrics(1440, 900).radius).toBeCloseTo(900 * 0.46);
  });
});

describe('depthAfterRotation', () => {
  const front = { x: 0, y: 0, z: 1, lat: 0, lon: 0 };

  it('keeps a front-facing point in front without rotation', () => {
    expect(depthAfterRotation(front, 0, 0)).toBeCloseTo(1);
  });

  it('sends it behind after half a turn', () => {
    expect(depthAfterRotation(front, 0, 180)).toBeCloseTo(-1);
  });
});
