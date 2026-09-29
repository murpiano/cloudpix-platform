import { describe, expect, it, vi } from 'vitest';
import { readJSON, writeJSON } from './storage';

const fake = (over: Partial<Storage> = {}): Storage =>
  ({ getItem: () => null, setItem: () => {}, ...over }) as Storage;

describe('writeJSON', () => {
  it('says it kept the value', () => {
    vi.stubGlobal('localStorage', fake());
    expect(writeJSON('k', { a: 1 })).toBe(true);
    vi.unstubAllGlobals();
  });

  it('says it did not, when there is no room and the browser throws', () => {
    vi.stubGlobal(
      'localStorage',
      fake({
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      }),
    );
    expect(writeJSON('k', { a: 1 })).toBe(false);
    vi.unstubAllGlobals();
  });

  it('falls back when reading is impossible', () => {
    vi.stubGlobal(
      'localStorage',
      fake({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    );
    expect(readJSON('k', 'fallback')).toBe('fallback');
    vi.unstubAllGlobals();
  });
});
