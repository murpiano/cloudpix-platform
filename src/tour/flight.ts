import { geoDistance, geoInterpolate } from 'd3-geo';
import { camCurve, quat } from '@/geo/camera';
import type { Quat, Rotation } from '@/geo/camera';
import { Z_MIN } from '@/geo/projection';
import type { LonLat } from '@/geo/vector';
import { smooth, smoother } from '@/lib/easing';
import { clamp } from '@/lib/math';

/** The plane fades in standing still, then flies. */
export const APPEAR_MS = 700;
/** It stops and fades out before the place lights up. */
export const VANISH_MS = 380;
/** A plane sent away climbs into space and dissolves over this time. */
export const ESCAPE_MS = 1600;
/** It keeps its shape for this share of the climb, then dissolves. */
const ESCAPE_SOLID = 0.35;
export const EARTH_KM = 6371;

export type FlightPhase = 'appear' | 'cruise' | 'vanish' | 'escape' | 'done';

export interface Flight {
  to: LonLat;
  /** The great circle, 0..1; null when there is nowhere to fly from: the camera only turns. */
  path: ((k: number) => LonLat) | null;
  km: number;
  q0: Quat;
  q1: Quat;
  /** Radians from the middle of the view to the destination: how high the camera rises. */
  rise: number;
  /** For a camera-only turn. */
  cameraMs: number;
  phase: FlightPhase;
  phaseMs: number;
  /** The plane's share of the way, at constant speed. */
  e: number;
  /** The camera's share of the turn. */
  c: number;
  /** False once the owner drags the globe: the camera lets go, the plane flies on. */
  follow: boolean;
}

/** A camera-only turn takes 2 s, up to 4 s for the far side of the globe. */
export const cameraTurnMs = (radians: number): number =>
  2000 + 2000 * clamp(radians / Math.PI, 0, 1);

export const createFlight = ({
  from,
  to,
  rot,
}: {
  from: LonLat | null;
  to: LonLat;
  rot: Rotation;
}): Flight => {
  const distance = from === null ? 0 : geoDistance(from, to);
  const flies = from !== null && distance > 1e-4;
  const rise = geoDistance([-rot[0], -rot[1]], to);
  return {
    to,
    path: flies && from !== null ? geoInterpolate(from, to) : null,
    km: flies ? distance * EARTH_KM : 0,
    q0: quat(rot),
    q1: quat([-to[0], -to[1], 0]),
    rise,
    cameraMs: cameraTurnMs(rise),
    phase: flies ? 'appear' : 'cruise',
    phaseMs: 0,
    e: 0,
    c: 0,
    follow: true,
  };
};

/**
 * The owner chose a range the plane's place is not in: it stops where it is and climbs away. There
 * is no plane to send away in a camera-only turn.
 */
export const beginEscape = (flight: Flight): void => {
  if (!flight.path || flight.phase === 'escape' || flight.phase === 'done') return;
  flight.phase = 'escape';
  flight.phaseMs = 0;
  flight.follow = false;
};

export const stepFlight = (flight: Flight, dt: number, cruiseMs: number): void => {
  if (!flight.path) {
    flight.e = Math.min(1, flight.e + dt / flight.cameraMs);
    flight.c = smoother(flight.e);
    if (flight.e >= 1) flight.phase = 'done';
    return;
  }
  switch (flight.phase) {
    case 'appear':
      flight.phaseMs += dt;
      if (flight.phaseMs >= APPEAR_MS) {
        flight.phase = 'cruise';
        flight.phaseMs = 0;
      }
      break;
    case 'cruise':
      flight.e = Math.min(1, flight.e + dt / cruiseMs);
      if (flight.e >= 1) {
        flight.phase = 'vanish';
        flight.phaseMs = 0;
      }
      break;
    case 'vanish':
      flight.phaseMs += dt;
      if (flight.phaseMs >= VANISH_MS) flight.phase = 'done';
      break;
    case 'escape':
      flight.phaseMs += dt;
      if (flight.phaseMs >= ESCAPE_MS) flight.phase = 'done';
      break;
    case 'done':
      break;
  }
  flight.c = camCurve(flight.e);
};

export const planeAlpha = ({ phase, phaseMs }: Flight): number => {
  if (phase === 'appear') return smooth(clamp(phaseMs / APPEAR_MS, 0, 1));
  if (phase === 'vanish') return 1 - smooth(clamp(phaseMs / VANISH_MS, 0, 1));
  if (phase === 'escape') {
    return 1 - smooth(clamp((phaseMs / ESCAPE_MS - ESCAPE_SOLID) / (1 - ESCAPE_SOLID), 0, 1));
  }
  if (phase === 'done') return 0;
  return 1;
};

/** 0 in flight; while it is sent away 0..1, slow at first and then faster and faster. */
export const planeLift = ({ phase, phaseMs }: Flight): number =>
  phase === 'escape' ? clamp(phaseMs / ESCAPE_MS, 0, 1) ** 2 : phase === 'done' ? 1 : 0;

/** The camera rises mid-flight in proportion to the distance, and settles on arrival. */
export const riseZoom = (z: number, { c, rise }: Flight): number =>
  Math.max(Z_MIN, z * (1 - 0.45 * Math.sin(Math.PI * c) * Math.min(1, rise / 1.4)));

/** The nose is straight up by this share of the climb. */
const NOSE_UP_BY = 0.3;

/**
 * The heading of a plane that is being sent away: the nose comes round to point straight up the
 * screen over the first part of the climb, the short way, so it rises nose first instead of
 * sliding upwards sideways.
 */
export const climbAngle = (angle: number, lift: number): number => {
  const share = smooth(clamp(lift / NOSE_UP_BY, 0, 1));
  if (share === 0) return angle;
  const turn = ((((-Math.PI / 2 - angle) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return angle + turn * share;
};
