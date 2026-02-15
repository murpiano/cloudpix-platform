import { describe, expect, it } from 'vitest';
import {
  apply,
  IDENTITY,
  multiply,
  orthonormalize,
  rotateX,
  rotateY,
  toCss,
  transpose,
} from './rotation';
import type { Mat3, Vec3 } from './rotation';

const expectVec = (actual: Vec3, expected: Vec3) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i] as number, 9));

describe('rotation', () => {
  const front: Vec3 = [0, 0, 1];

  it('matches CSS rotateY: a quarter turn swings the front to the right', () => {
    expectVec(apply(rotateY(90), front), [1, 0, 0]);
  });

  it('matches CSS rotateX: a quarter turn swings the front downwards', () => {
    expectVec(apply(rotateX(90), front), [0, -1, 0]);
  });

  it('keeps turning past the poles', () => {
    const upsideDown = multiply(rotateX(120), rotateX(120));
    expectVec(apply(upsideDown, front), apply(rotateX(240), front));
  });

  it('has the transpose as its inverse', () => {
    const m = multiply(rotateY(37), rotateX(-58));
    const back = multiply(m, transpose(m));
    back.forEach((value, i) => expect(value).toBeCloseTo(IDENTITY[i] as number, 9));
  });

  it('repairs drift', () => {
    const skewed = rotateY(30).map((value, i) =>
      i === 0 ? value * 1.01 : value,
    ) as unknown as Mat3;
    const fixed = orthonormalize(skewed);
    const back = multiply(fixed, transpose(fixed));
    back.forEach((value, i) => expect(value).toBeCloseTo(IDENTITY[i] as number, 9));
  });

  it('writes column-major matrix3d', () => {
    expect(toCss(IDENTITY)).toBe('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
  });
});
