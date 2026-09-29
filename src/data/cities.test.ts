import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseCities } from './cities';
import type { CityFile } from './cities';

describe('parseCities', () => {
  const file: CityFile = {
    countries: [
      ['203', 'Czechia', 'Чехия'],
      ['250', 'France', ''],
    ],
    cities: [
      ['Paris', '', 'Париж', 1, 48.85, 2.35],
      ['Plzeň', 'Plzen', '', 0, 49.75, 13.38],
      ['Nowhere', '', '', 9, 0, 0],
    ],
  };

  it('makes a place of each row, with its country, and drops a row of no country', () => {
    const list = parseCities(file);
    expect(list.map((place) => place.name)).toEqual(['Paris', 'Plzeň']);
    expect(list[1]).toMatchObject({ country: 'Czechia', countryId: '203', lat: 49.75, lon: 13.38 });
    expect(list[0]?.ru).toBe('Париж');
  });

  it('keeps the plain-letter and Russian names searchable next to the real one', () => {
    const [paris, plzen] = parseCities(file);
    expect(plzen?.find.slice(0, plzen.at)).toBe('plzen plzen');
    expect(plzen?.find).toContain('|czechia чехия');
    expect(paris?.find.slice(0, paris.at)).toBe('paris париж');
  });
});

describe('the bundled list of cities', () => {
  const list = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../public/data/cities.json', import.meta.url)), 'utf8'),
  ) as CityFile;

  it('is the size of the world, with a country code the map knows for every city', () => {
    expect(list.cities.length).toBeGreaterThan(60000);
    for (const [id] of list.countries) expect(id).toMatch(/^\d{3}$/);
    expect(list.cities.every((row) => list.countries[row[3]] !== undefined)).toBe(true);
  });

  it('has the big cities first', () => {
    const top = list.cities.slice(0, 40).map((row) => row[0]);
    expect(top).toEqual(expect.arrayContaining(['Shanghai', 'Tokyo']));
  });
});
