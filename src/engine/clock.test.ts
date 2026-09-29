import { describe, expect, it } from 'vitest';
import { FRAME_MS, frameStep, MAX_STEP_MS } from './clock';

describe('frameStep', () => {
  it('treats the first frame as one 60 Hz frame', () => {
    expect(frameStep(1234, null, false)).toEqual({ real: FRAME_MS, dt: FRAME_MS, f: 1 });
  });

  it('measures the time since the last frame', () => {
    const step = frameStep(1033.4, 1000, false);
    expect(step.real).toBeCloseTo(33.4);
    expect(step.f).toBeCloseTo(2);
  });

  it('does not jump when a tab comes back from the background', () => {
    expect(frameStep(60000, 1000, false).dt).toBe(MAX_STEP_MS);
  });

  it('stops the world clock while paused, not the real one', () => {
    const step = frameStep(1016.7, 1000, true);
    expect(step.dt).toBe(0);
    expect(step.f).toBe(0);
    expect(step.real).toBeCloseTo(16.7);
  });

  it('never runs backwards', () => {
    expect(frameStep(900, 1000, false).dt).toBe(0);
  });
});
