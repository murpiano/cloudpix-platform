import { geoClipAntimeridian, geoClipCircle, geoProjectionMutator } from 'd3-geo';
import type { GeoProjection, GeoStream } from 'd3-geo';
import { smoother } from '@/lib/easing';
import { clamp, DEG } from '@/lib/math';
import { dot } from './vector';
import type { Vec3 } from './vector';

/**
 * Zoomed in, the ball (t = 0, orthographic) unrolls into a flat map (t = 1, equirectangular):
 * x = (1 − t)·cos φ sin λ + t·λ, y = (1 − t)·sin φ + t·φ. λ and φ in radians.
 */
export const raw = (t: number, lambda: number, phi: number): [number, number] => [
  (1 - t) * Math.cos(phi) * Math.sin(lambda) + t * lambda,
  (1 - t) * Math.sin(phi) + t * phi,
];

/**
 * The map never folds over itself while cos c > −t / (1 − t), c being the distance from the
 * centre, so the clip circle grows with t; from t = .5 the whole sphere fits.
 */
export const clipCos = (t: number): number => (t <= 0 ? 0 : t >= 0.5 ? -1 : -t / (1 - t));

export type ClipKind = 'circle' | 'circle+antimeridian' | 'antimeridian';

export const clipKind = (t: number): ClipKind =>
  t <= 0 ? 'circle' : t >= 0.5 ? 'antimeridian' : 'circle+antimeridian';

type Clip = (stream: GeoStream) => GeoStream;

export const clipFor = (t: number): Clip => {
  switch (clipKind(t)) {
    case 'circle':
      return geoClipCircle(Math.PI / 2);
    case 'antimeridian':
      return geoClipAntimeridian;
    case 'circle+antimeridian': {
      const circle = geoClipCircle(Math.acos(clipCos(t)));
      return (sink) => circle(geoClipAntimeridian(sink));
    }
  }
};

/**
 * Whether a point shows: on the ball, `margin` inside the clip edge; from t = .5, always (the flat
 * map holds the whole sphere, the far side at its left and right edges).
 */
export const faces = (point: Vec3, centre: Vec3, t: number, margin: number): boolean =>
  clipCos(t) <= -1 || dot(point, centre) >= clipCos(t) + margin;

/** One d3 projection whose raw function follows the unroll blend. */
export const createBlendProjection = (): {
  projection: GeoProjection;
  blend: (t: number) => void;
} => {
  // @types/d3-geo types the mutator without arguments; d3 passes them to the factory.
  const mutate = geoProjectionMutator(
    (t: number) => (lambda: number, phi: number) => raw(t, lambda, phi),
  ) as unknown as (t: number) => GeoProjection;
  const projection = mutate(0).precision(0.8);
  return {
    projection,
    blend: (t) => {
      mutate(t);
    },
  };
};

/** A wheel notch is 100 units of deltaY. */
export const WHEEL_ZOOM = 0.0012;
/** How much one wheel notch zooms. */
export const NOTCH = Math.exp(100 * WHEEL_ZOOM);
export const UNROLL_MS = 1100;
/** Farthest out: half the resting size. */
export const Z_MIN = 0.5;
export const Z_MAX = 7;

export interface Viewport {
  width: number;
  height: number;
  /** Where the globe's centre sits on screen. */
  cx: number;
  cy: number;
  /** Resting radius of the ball. */
  r0: number;
}

/**
 * The zoom where the ball unrolls: three notches before its edge would touch the edge of the
 * screen, never at the resting size, and never so small that the flat map leaves a gap.
 */
export const zFlat = ({ width, height, cx, cy, r0 }: Viewport): number => {
  const touch = Math.min(cx, width - cx, cy, height - cy);
  const fill =
    (Math.max(2 * Math.max(cy, height - cy), Math.max(cx, width - cx)) / Math.PI) * 1.02;
  return Math.max(touch / NOTCH ** 3, r0 * 1.05, fill) / r0;
};

export interface Unroll {
  flat: boolean;
  from: number;
  to: number;
  /** World time the current animation started. */
  at: number;
}

export const ROLLED: Unroll = { flat: false, from: 0, to: 0, at: -Infinity };

/**
 * Decides on the wheel's own target, not on the eased zoom, so zooming in and out switch at the
 * very same notch. A switch mid-animation turns around from the current blend `t`.
 */
export const stepUnroll = (
  unroll: Unroll,
  t: number,
  zTarget: number,
  zf: number,
  now: number,
): Unroll => {
  if (!unroll.flat && zTarget >= zf) return { flat: true, from: t, to: 1, at: now };
  if (unroll.flat && zTarget < zf) return { flat: false, from: t, to: 0, at: now };
  return unroll;
};

export const unrollT = ({ from, to, at }: Unroll, now: number): number =>
  from + (to - from) * smoother(clamp((now - at) / UNROLL_MS, 0, 1));

/** On the flat map the centre may not go so far north or south that the world's edge shows. */
export const flatLatLimit = (cy: number, height: number, r: number): number =>
  Math.max(0, 90 - Math.max(cy, height - cy) / r / DEG);
