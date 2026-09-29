import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, settingsStore } from './settings';

describe('settingsStore', () => {
  it('starts from the defaults when nothing is kept', () => {
    expect(DEFAULT_SETTINGS).toEqual({ photoSeconds: 5, flightSeconds: 30, help: true });
    expect(settingsStore.get()).toEqual(DEFAULT_SETTINGS);
  });
});
