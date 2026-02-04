import { describe, expect, it } from 'vitest';
import { normalizeTag, serializeTags, tagError, TagRules } from './tags';

describe('normalizeTag', () => {
  it('strips hashes and whitespace, lowercases', () => {
    expect(normalizeTag('  ##Sea_Light ')).toBe('sea_light');
  });
});

describe('tagError', () => {
  it('accepts letters of any script, digits and underscore', () => {
    expect(tagError('закат_2026', [])).toBeNull();
  });

  it('rejects bad length', () => {
    expect(tagError('a', [])).toMatch(/characters/);
    expect(tagError('a'.repeat(TagRules.MAX_LENGTH + 1), [])).toMatch(/characters/);
  });

  it('rejects punctuation', () => {
    expect(tagError('sea-light', [])).toMatch(/letters/);
  });

  it('rejects duplicates and overflow', () => {
    expect(tagError('sea', ['sea'])).toMatch(/already/);
    const full = Array.from({ length: TagRules.MAX_COUNT }, (_, i) => `t${i}`);
    expect(tagError('more', full)).toMatch(/Up to/);
  });
});

describe('serializeTags', () => {
  it('joins tags for the form payload', () => {
    expect(serializeTags(['sea', 'dusk'])).toBe('#sea #dusk');
  });
});
