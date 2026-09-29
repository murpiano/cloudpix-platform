import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '@/state/app-state';
import type { AppState } from '@/state/app-state';
import type { Tour } from '@/tour/tour';
import { returnStep } from './return';

const tour: Tour = {
  kind: 'year',
  list: [1, 2],
  start: null,
  end: null,
  name: '2023',
  tripId: null,
  year: 2023,
};
const playing: AppState = { ...INITIAL_STATE, tour, playing: true, focus: 1 };
const ended: AppState = { ...playing, playing: false, focus: 2, tourDone: 1 };

describe('returnStep while a tour plays', () => {
  it('arms the return when the tour ends by itself', () => {
    expect(returnStep(false, { ...playing, focus: 2 }, ended)).toBe('arm');
  });

  it('cancels when the owner stops or leaves it', () => {
    expect(returnStep(false, playing, { ...playing, playing: false })).toBe('cancel');
    expect(returnStep(false, playing, { ...playing, tour: null })).toBe('cancel');
  });

  it('lets the tour move on from album to album', () => {
    expect(returnStep(false, playing, { ...playing, focus: 2 })).toBeNull();
  });
});

describe('returnStep after the tour ended', () => {
  it('cancels when the owner plays again, picks a place or a range, or lets go', () => {
    expect(returnStep(true, ended, { ...ended, playing: true })).toBe('cancel');
    expect(returnStep(true, ended, { ...ended, focus: 5 })).toBe('cancel');
    expect(returnStep(true, ended, { ...ended, range: { lo: 1, hi: 2 } })).toBe('cancel');
    expect(returnStep(true, ended, { ...ended, focus: -1, tour: null })).toBe('cancel');
  });

  it('waits through what does not concern the tour', () => {
    expect(returnStep(true, ended, { ...ended, labelCityKey: 'paris' })).toBeNull();
    expect(returnStep(true, ended, { ...ended, menu: 'settings' })).toBeNull();
  });
});
