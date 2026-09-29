import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildDemo, DEMO_HOME } from './demo';
import { slugOf } from './order';
import type { Credit } from './types';

const demoDir = fileURLToPath(new URL('../../public/demo/', import.meta.url));
const credits = JSON.parse(readFileSync(`${demoDir}photos.json`, 'utf8')) as Credit[];
const demo = buildDemo(credits);
const cities = demo.countries.flatMap((country) => country.cities);
const albums = cities.flatMap((city) => city.albums);

const cityOf = (key: string) => {
  const city = cities.find((c) => c.key === key);
  if (!city) throw new Error(`no demo city ${key}`);
  return city;
};

describe('demo archive', () => {
  it('has the size the design promises', () => {
    expect(demo.countries).toHaveLength(12);
    expect(cities).toHaveLength(22);
    expect(albums).toHaveLength(32);
    expect(demo.trips).toHaveLength(23);
  });

  it('lives in Kyiv', () => {
    expect(DEMO_HOME).toEqual({
      name: 'Kyiv',
      country: 'Ukraine',
      countryId: '804',
      lat: 50.45,
      lon: 30.52,
    });
  });

  it('gives every album its own id', () => {
    expect(new Set(albums.map((album) => album.id)).size).toBe(albums.length);
  });

  it('puts every album in exactly one trip', () => {
    const counts = new Map<string, number>();
    for (const trip of demo.trips) {
      for (const id of trip.albumIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual(albums.map((album) => album.id).sort());
    expect([...counts.values()].every((count) => count === 1)).toBe(true);
  });

  it('starts and ends every demo trip at home', () => {
    for (const trip of demo.trips) {
      expect(trip.start).toEqual({ home: true });
      expect(trip.end).toEqual({ home: true });
    }
  });

  it('gives every album a valid day and time', () => {
    for (const album of albums) {
      expect(album.day).toBeGreaterThanOrEqual(1);
      expect(album.day).toBeLessThanOrEqual(26);
      expect(album.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });

  it('gives every album at least one stock photo', () => {
    for (const album of albums) {
      expect(album.photos.length, album.id).toBeGreaterThan(0);
      expect(album.photos.every((photo) => photo.kind === 'stock')).toBe(true);
    }
  });

  it('opens each album of a city on a different photo', () => {
    const barcelona = cityOf('barcelona');
    const covers = barcelona.albums.map((album) => {
      const first = album.photos[0];
      return first?.kind === 'stock' ? first.file : '';
    });
    expect(new Set(covers).size).toBe(barcelona.albums.length);
  });

  it('credits only demo cities', () => {
    const keys = new Set(cities.map((city) => city.key));
    for (const credit of credits) expect(keys.has(slugOf(credit.city)), credit.city).toBe(true);
  });

  it('finds every credited photo on disk', () => {
    for (const credit of credits) {
      expect(existsSync(`${demoDir}photos/${credit.file}`), credit.file).toBe(true);
    }
  });
});
