/**
 * 3×3 rotation matrices in CSS space (x right, y down, z towards the viewer),
 * stored row-major. Accumulating drags as matrices instead of yaw/pitch
 * angles lets the sphere turn freely in any direction without gimbal lock.
 */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Vec3 = readonly [number, number, number];

const TO_RAD = Math.PI / 180;

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Same as CSS rotateX(deg). */
export const rotateX = (deg: number): Mat3 => {
  const c = Math.cos(deg * TO_RAD);
  const s = Math.sin(deg * TO_RAD);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};

/** Same as CSS rotateY(deg). */
export const rotateY = (deg: number): Mat3 => {
  const c = Math.cos(deg * TO_RAD);
  const s = Math.sin(deg * TO_RAD);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};

export const multiply = (a: Mat3, b: Mat3): Mat3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
  a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
  a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
  a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
  a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
  a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
  a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];

export const transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

export const apply = (m: Mat3, [x, y, z]: Vec3): Vec3 => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];

/** Re-orthonormalises rows (Gram–Schmidt) so rounding errors never skew the sphere. */
export const orthonormalize = (m: Mat3): Mat3 => {
  const norm = (v: Vec3): Vec3 => {
    const length = Math.hypot(...v) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  };
  const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  const x = norm([m[0], m[1], m[2]]);
  const yRaw: Vec3 = [m[3], m[4], m[5]];
  const d = dot(x, yRaw);
  const y = norm([yRaw[0] - d * x[0], yRaw[1] - d * x[1], yRaw[2] - d * x[2]]);
  const z: Vec3 = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];

  return [...x, ...y, ...z] as unknown as Mat3;
};

/** CSS matrix3d() is column-major. */
export const toCss = (m: Mat3): string =>
  `matrix3d(${m[0]},${m[3]},${m[6]},0,${m[1]},${m[4]},${m[7]},0,${m[2]},${m[5]},${m[8]},0,0,0,0,1)`;
