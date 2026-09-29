import { clamp, DEG, lerp } from '@/lib/math';

/** d3-geo rotation angles [λ, φ, γ] in degrees. */
export type Rotation = [number, number, number];
export type Quat = [number, number, number, number];

export const quat = ([lam, phi, gam]: Rotation): Quat => {
  const l = (lam * DEG) / 2;
  const p = (phi * DEG) / 2;
  const g = (gam * DEG) / 2;
  const sl = Math.sin(l);
  const cl = Math.cos(l);
  const sp = Math.sin(p);
  const cp = Math.cos(p);
  const sg = Math.sin(g);
  const cg = Math.cos(g);
  return [
    cl * cp * cg + sl * sp * sg,
    cl * cp * sg - sl * sp * cg,
    cl * sp * cg + sl * cp * sg,
    sl * cp * cg - cl * sp * sg,
  ];
};

export const euler = ([a, b, c, d]: Quat): Rotation => [
  Math.atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) / DEG,
  Math.asin(clamp(2 * (a * c - d * b), -1, 1)) / DEG,
  Math.atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) / DEG,
];

export const qmul = ([a1, b1, c1, d1]: Quat, [a2, b2, c2, d2]: Quat): Quat => [
  a1 * a2 - b1 * b2 - c1 * c2 - d1 * d2,
  a1 * b2 + b1 * a2 + c1 * d2 - d1 * c2,
  a1 * c2 - b1 * d2 + c1 * a2 + d1 * b2,
  a1 * d2 + b1 * c2 - c1 * b2 + d1 * a2,
];

/** Spherical interpolation along the short way. */
export const slerp = (a: Quat, b: Quat, t: number): Quat => {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let to = b;
  if (cos < 0) {
    to = [-b[0], -b[1], -b[2], -b[3]];
    cos = -cos;
  }
  if (cos > 0.9995) {
    const mixed: Quat = [
      lerp(a[0], to[0], t),
      lerp(a[1], to[1], t),
      lerp(a[2], to[2], t),
      lerp(a[3], to[3], t),
    ];
    const length = Math.hypot(...mixed);
    return [mixed[0] / length, mixed[1] / length, mixed[2] / length, mixed[3] / length];
  }
  const theta = Math.acos(cos);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return [
    wa * a[0] + wb * to[0],
    wa * a[1] + wb * to[1],
    wa * a[2] + wb * to[2],
    wa * a[3] + wb * to[3],
  ];
};

export const wrapLon = (lon: number): number =>
  lon > 180 ? lon - 360 : lon < -180 ? lon + 360 : lon;

/**
 * A drag of `dx`, `dy` degrees. On the ball (t = 0) it is a small trackball turn about the screen
 * axes, so the globe goes wherever the hand goes, over the poles too. On the flat map (t = 1) it is
 * a plain pan. In between, both in proportion.
 */
export const turn = ([lam, phi, gam]: Rotation, dx: number, dy: number, t: number): Rotation => {
  let rot: Rotation = [lam, phi, gam];
  const ball = 1 - t;
  if (ball > 0) {
    rot = euler(qmul(quat(rot), quat([dx * ball, -dy * ball, 0])));
  }
  if (t > 0) {
    rot = [rot[0] + dx * t, rot[1] - dy * t, rot[2]];
  }
  return [wrapLon(rot[0]), rot[1], rot[2]];
};

/**
 * The camera's share of a flight, for the plane's share `e` (0..1, constant speed). The camera
 * eases in over the first 14 % and out over the last 14 % around the plane's speed: it trails the
 * plane a little on take-off, leads it a little before landing, and lands with it.
 */
export const RAMP = 0.14;
const CRUISE = 1 / (1 - RAMP);

export const camCurve = (e: number): number => {
  // ∫ smoothstep, scaled so the ramps meet the cruise speed
  const ramp = (x: number) => CRUISE * RAMP * (x * x * x - (x * x * x * x) / 2);
  if (e < RAMP) return ramp(e / RAMP);
  if (e > 1 - RAMP) return 1 - ramp((1 - e) / RAMP);
  return CRUISE * (e - RAMP / 2);
};
