import { describe, expect, it } from 'vitest';
import { dateInput, parseDate, placeLabel, samePlace } from './fields';

const PARIS = { name: 'Paris', country: 'France', countryId: '250', lat: 48.86, lon: 2.35 };

describe('the form fields', () => {
  it('writes a date the way an input wants it', () => {
    expect(dateInput({ year: 2022, month: 5, day: 3 })).toBe('2022-05-03');
  });

  it('reads a date back, and refuses one that is not a date', () => {
    expect(parseDate('2022-05-03')).toEqual({ year: 2022, month: 5, day: 3 });
    expect(parseDate('')).toBeNull();
    expect(parseDate('2022-13-40')).toBeNull();
  });

  it('shows a place as its city and country', () => {
    expect(placeLabel(PARIS)).toBe('Paris, France');
  });

  it('tells two places apart by name and country, not by object', () => {
    expect(samePlace(PARIS, { ...PARIS })).toBe(true);
    expect(samePlace(PARIS, { ...PARIS, country: 'Texas', countryId: '840' })).toBe(false);
    expect(samePlace(null, PARIS)).toBe(false);
  });
});
