import { describe, expect, it } from 'vitest';
import { MAX_OUTPUT_SIDE, planCrop } from './bake';
import { effectFilter, EFFECTS } from './effects';

describe('effectFilter', () => {
  it('returns none for the original and for zero strength', () => {
    expect(effectFilter('none', 100)).toBe('none');
    expect(effectFilter('mono', 0)).toBe('none');
    expect(effectFilter('unknown', 80)).toBe('none');
  });

  it('scales with strength', () => {
    expect(effectFilter('mono', 50)).toBe('grayscale(0.5)');
    expect(effectFilter('mono', 150)).toBe('grayscale(1)');
  });

  it('rescales blur for larger outputs', () => {
    expect(effectFilter('blur', 100, 2)).toBe('blur(8px)');
  });

  it('has unique ids', () => {
    const ids = EFFECTS.map((effect) => effect.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('planCrop', () => {
  it('keeps the full frame at 100%', () => {
    expect(planCrop(1200, 800, 100)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1200,
      sh: 800,
      width: 1200,
      height: 800,
    });
  });

  it('crops the centre when zoomed', () => {
    const plan = planCrop(1200, 800, 200);
    expect(plan).toMatchObject({ sx: 300, sy: 200, sw: 600, sh: 400 });
  });

  it('never exceeds the output limit', () => {
    const plan = planCrop(6000, 4000, 100);
    expect(Math.max(plan.width, plan.height)).toBe(MAX_OUTPUT_SIDE);
  });
});
