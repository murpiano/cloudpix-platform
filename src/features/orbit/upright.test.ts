import { describe, expect, it } from 'vitest';
import { fibonacciSphere } from './layout';
import { apply, multiply, rotateX, rotateY } from './rotation';
import type { Mat3, Vec3 } from './rotation';
import { uprightCard } from './upright';

const RADIUS = 414;
const camera = { perspective: 1150, z: 0 };

const column = (m: number[], i: number): Vec3 => [
  m[i * 4] as number,
  m[i * 4 + 1] as number,
  m[i * 4 + 2] as number,
];

/** Screen y of a point in screen space under CSS perspective. */
const screenY = ([, y, z]: Vec3): number => (y * camera.perspective) / (camera.perspective - z);

const along = (origin: Vec3, dir: Vec3, t: number): Vec3 => [
  origin[0] + dir[0] * t,
  origin[1] + dir[1] * t,
  origin[2] + dir[2] * t,
];

const orientations: Mat3[] = [
  rotateX(-4),
  rotateX(95),
  rotateX(180),
  multiply(rotateY(130), rotateX(-160)),
  multiply(rotateX(71), rotateY(-243)),
];

const points: Vec3[] = fibonacciSphere(19).map(({ x, y, z }) => [x, -y, z]);

describe('uprightCard', () => {
  it('shows every visible card upright and level, through the perspective', () => {
    for (const orientation of orientations) {
      for (const point of points) {
        const m = uprightCard(orientation, point, RADIUS, camera);
        const normal = apply(orientation, column(m, 2));
        const down = apply(orientation, column(m, 1));
        const right = apply(orientation, column(m, 0));
        const centre = apply(orientation, [
          point[0] * RADIUS,
          point[1] * RADIUS,
          point[2] * RADIUS,
        ]);

        const toViewer: Vec3 = [-centre[0], -centre[1], camera.perspective - centre[2]];
        const facesViewer =
          normal[0] * toViewer[0] + normal[1] * toViewer[1] + normal[2] * toViewer[2] > 0;
        if (!facesViewer) {
          continue;
        }

        // Top edge above the bottom edge on screen.
        expect(screenY(along(centre, down, -30))).toBeLessThan(screenY(along(centre, down, 30)));
        // Horizontal edge level on screen (to first order).
        expect(screenY(along(centre, right, 0.01))).toBeCloseTo(
          screenY(along(centre, right, -0.01)),
          4,
        );
      }
    }
  });

  it('faces the card outwards from the sphere centre', () => {
    const orientation = orientations[3] as Mat3;
    const point = points[7] as Vec3;
    const normal = column(uprightCard(orientation, point, RADIUS, camera), 2);
    normal.forEach((value, i) => expect(value).toBeCloseTo(point[i] as number, 9));
  });

  it('places the card on the sphere surface', () => {
    const m = uprightCard(rotateX(33), [0, 0, 1], 250, camera);
    expect(m.slice(12)).toEqual([0, 0, 250, 1]);
  });

  it('matches the classic layout for the front card at rest', () => {
    const m = uprightCard(rotateX(0), [0, 0, 1], 1, camera);
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0].forEach((value, i) => expect(m[i]).toBeCloseTo(value, 9));
  });
});
