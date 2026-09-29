import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '@/state/app-state';
import type { AppState } from '@/state/app-state';
import type { Tour } from '@/tour/tour';
import { tourOutcome } from './return';

const tour: Tour = {
  kind: 'year',
  list: [1, 2],
  start: null,
  end: null,
  name: '2023',
  tripId: null,
  year: 2023,
};
const playing: AppState = { ...INITIAL_STATE, tour, playing: true };

describe('tourOutcome', () => {
  it('sees a tour that ended by itself', () => {
    expect(tourOutcome(playing, { ...playing, playing: false, tourDone: 1 })).toBe('finished');
  });

  it('sees the owner stop or leave it', () => {
    expect(tourOutcome(playing, { ...playing, playing: false })).toBe('interrupted');
    expect(tourOutcome(playing, { ...playing, tour: null })).toBe('interrupted');
  });

  it('ignores everything else', () => {
    expect(tourOutcome(playing, { ...playing, focus: 3 })).toBeNull();
    expect(tourOutcome(INITIAL_STATE, { ...INITIAL_STATE, range: { lo: 1, hi: 2 } })).toBeNull();
  });
});
