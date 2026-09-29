import { describe, expect, it } from 'vitest';
import { MONTHS, monthYear } from './dates';

describe('monthYear', () => {
  it('names the month and the year', () => {
    expect(monthYear({ year: 2023, month: 4 })).toBe('Apr 2023');
    expect(monthYear({ year: 2016, month: 12 })).toBe('Dec 2016');
    expect(MONTHS).toHaveLength(12);
  });
});
