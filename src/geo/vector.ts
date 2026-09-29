import { DEG } from '@/lib/math';

export type Vec3 = [number, number, number];

/** The unit vector of a point on the sphere; lon and lat in degrees. */
export const vec = (lon: number, lat: number): Vec3 => [
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A point on Earth as d3 takes it: [longitude, latitude] in degrees. */
export type LonLat = [number, number];
