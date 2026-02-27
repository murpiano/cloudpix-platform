import { apply, transpose } from './rotation';
import type { Mat3, Vec3 } from './rotation';

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Part of `v` that lies in the plane perpendicular to the unit vector `n`, normalised; null if none. */
const tangent = (v: Vec3, n: Vec3): Vec3 | null => {
  const d = dot(v, n);
  const t: Vec3 = [v[0] - d * n[0], v[1] - d * n[1], v[2] - d * n[2]];
  const length = Math.hypot(...t);
  return length < 1e-6 ? null : [t[0] / length, t[1] / length, t[2] / length];
};

export interface Camera {
  /** CSS perspective distance, px. */
  perspective: number;
  /** Dolly offset of the world towards the viewer, px. */
  z: number;
}

/**
 * Column-major matrix3d() values that place a card on the sphere inside the
 * rotated world. The card faces outwards, and its top edge is the direction
 * that moves *up on screen* fastest — measured through the perspective
 * projection, so even a card seen at a grazing angle near a pole is never
 * shown upside down.
 *
 * `point` is the card's unit position in world space (CSS axes: y down).
 */
export const uprightCard = (
  orientation: Mat3,
  point: Vec3,
  radius: number,
  camera: Camera,
): number[] => {
  const normal = apply(orientation, point); // outward direction, screen space
  const centre: Vec3 = [normal[0] * radius, normal[1] * radius, normal[2] * radius + camera.z];

  // Screen y is y·p / (p − z); moving by d changes it along (0, p − z, y).
  // Its negative is "up on screen"; keep the part that lies in the card plane.
  const screenUp: Vec3 = [0, -(camera.perspective - centre[2]), -centre[1]];
  const up = tangent(screenUp, normal) ?? tangent([0, -1, 0], normal) ?? [0, 0, 1];

  const down: Vec3 = [-up[0], -up[1], -up[2]];
  const right = cross(down, normal);

  // Same axes expressed in the world's own space: the world applies `orientation` on top.
  const back = transpose(orientation);
  const [x, y, z] = [apply(back, right), apply(back, down), apply(back, normal)];

  return [
    ...[x[0], x[1], x[2], 0],
    ...[y[0], y[1], y[2], 0],
    ...[z[0], z[1], z[2], 0],
    ...[point[0] * radius, point[1] * radius, point[2] * radius, 1],
  ];
};
