import { describe, expect, it } from 'vitest';
import { hueOf, initials } from './monogram';

describe('initials', () => {
  it('takes the first letter of up to two words', () => {
    expect(initials('Anna Lee')).toBe('AL');
    expect(initials('  stephan ')).toBe('S');
    expect(initials('Jean Luc Picard')).toBe('JL');
  });

  it('falls back for empty names', () => {
    expect(initials('   ')).toBe('?');
  });
});

describe('hueOf', () => {
  it('is stable and in range', () => {
    expect(hueOf('Elena')).toBe(hueOf('Elena'));
    expect(hueOf('Elena')).toBeGreaterThanOrEqual(0);
    expect(hueOf('Elena')).toBeLessThan(360);
    expect(hueOf('Elena')).not.toBe(hueOf('Stephan'));
  });
});
