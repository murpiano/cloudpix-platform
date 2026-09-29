import { describe, expect, it } from 'vitest';
import { cleanSettings, DEFAULT_SETTINGS, settingsStore } from './settings';

describe('settingsStore', () => {
  it('starts from the defaults when nothing is kept', () => {
    expect(DEFAULT_SETTINGS).toEqual({ photoSeconds: 5, flightSeconds: 30, slideSeconds: 4, help: true });
    expect(settingsStore.get()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('cleanSettings', () => {
  it('keeps good values and clamps the rest to their limits', () => {
    expect(cleanSettings({ photoSeconds: 7, flightSeconds: 45, slideSeconds: 3, help: false })).toEqual({
      photoSeconds: 7,
      flightSeconds: 45,
      slideSeconds: 3,
      help: false,
    });
    expect(cleanSettings({ photoSeconds: 99, flightSeconds: 1, slideSeconds: -4 })).toMatchObject({
      photoSeconds: 15,
      flightSeconds: 5,
      slideSeconds: 2,
    });
  });

  it('falls back to the defaults for anything broken', () => {
    expect(cleanSettings({ flightSeconds: 'x', photoSeconds: NaN, help: 'yes' })).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});
