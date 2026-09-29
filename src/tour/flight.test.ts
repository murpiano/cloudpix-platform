import { describe, expect, it } from 'vitest';
import { Z_MIN } from '@/geo/projection';
import type { LonLat } from '@/geo/vector';
import {
  APPEAR_MS,
  cameraTurnMs,
  createFlight,
  planeAlpha,
  riseZoom,
  stepFlight,
  VANISH_MS,
} from './flight';

const KYIV: LonLat = [30.52, 50.45];
const PARIS: LonLat = [2.35, 48.86];
const CRUISE = 30000;

const run = (flight: ReturnType<typeof createFlight>, ms: number) => {
  for (let t = 0; t < ms; t += 10) stepFlight(flight, 10, CRUISE);
};

describe('createFlight', () => {
  it('flies the great circle and knows its length', () => {
    const flight = createFlight({ from: KYIV, to: PARIS, rot: [-30, -50, 0] });
    expect(flight.km).toBeGreaterThan(1990);
    expect(flight.km).toBeLessThan(2060);
    expect(flight.path?.(0)[0]).toBeCloseTo(KYIV[0]);
    expect(flight.path?.(1)[1]).toBeCloseTo(PARIS[1]);
    expect(flight.phase).toBe('appear');
  });

  it('only turns the camera when there is nowhere to fly from', () => {
    expect(createFlight({ from: null, to: PARIS, rot: [0, 0, 0] }).path).toBeNull();
    expect(createFlight({ from: PARIS, to: PARIS, rot: [0, 0, 0] }).path).toBeNull();
  });
});

describe('stepFlight', () => {
  it('fades in standing, flies at constant speed, stops and fades out', () => {
    const flight = createFlight({ from: KYIV, to: PARIS, rot: [-30, -50, 0] });
    run(flight, APPEAR_MS - 10);
    expect(flight.phase).toBe('appear');
    expect(flight.e).toBe(0);
    run(flight, 20);
    expect(flight.phase).toBe('cruise');
    run(flight, CRUISE / 2);
    expect(flight.e).toBeCloseTo(0.5, 2);
    run(flight, CRUISE / 2);
    expect(flight.phase).toBe('vanish');
    expect(flight.e).toBe(1);
    run(flight, VANISH_MS + 10);
    expect(flight.phase).toBe('done');
    expect(flight.c).toBeCloseTo(1);
  });

  it('turns the camera alone in 2 to 4 s', () => {
    expect(cameraTurnMs(0)).toBe(2000);
    expect(cameraTurnMs(Math.PI)).toBe(4000);
    const flight = createFlight({ from: null, to: PARIS, rot: [0, 0, 0] });
    run(flight, flight.cameraMs - 20);
    expect(flight.phase).not.toBe('done');
    run(flight, 30);
    expect(flight.phase).toBe('done');
    expect(flight.c).toBe(1);
  });

  it('stands still while the world is paused', () => {
    const flight = createFlight({ from: KYIV, to: PARIS, rot: [-30, -50, 0] });
    run(flight, 1000);
    const e = flight.e;
    stepFlight(flight, 0, CRUISE);
    expect(flight.e).toBe(e);
  });
});

describe('planeAlpha', () => {
  it('fades the plane in and out', () => {
    const flight = createFlight({ from: KYIV, to: PARIS, rot: [-30, -50, 0] });
    expect(planeAlpha(flight)).toBe(0);
    run(flight, APPEAR_MS + 100);
    expect(planeAlpha(flight)).toBe(1);
    run(flight, CRUISE + VANISH_MS + 20);
    expect(planeAlpha(flight)).toBe(0);
  });
});

describe('riseZoom', () => {
  it('rises mid-flight in proportion to distance and settles at both ends', () => {
    const near = createFlight({ from: KYIV, to: PARIS, rot: [-30, -50, 0] });
    const far = createFlight({ from: KYIV, to: PARIS, rot: [150, 30, 0] });
    expect(riseZoom(1, near)).toBe(1);
    near.c = 0.5;
    far.c = 0.5;
    expect(riseZoom(1, far)).toBeLessThan(riseZoom(1, near));
    expect(riseZoom(1, far)).toBeGreaterThanOrEqual(Z_MIN);
    far.c = 1;
    expect(riseZoom(1, far)).toBeCloseTo(1);
  });
});
