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

describe('demo archive', () => {
  it('has the size the design promises', () => {
    expect(demo.countries).toHaveLength(8);
    expect(cities).toHaveLength(9);
    expect(albums).toHaveLength(11);
    expect(demo.trips).toHaveLength(2);
  });

  it('lives in Saint Petersburg', () => {
    expect(DEMO_HOME).toEqual({
      name: 'Saint Petersburg',
      country: 'Russia',
      countryId: '643',
      lat: 59.93,
      lon: 30.34,
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

  it('gives every album ten stock photos', () => {
    for (const album of albums) {
      expect(album.photos, album.id).toHaveLength(10);
      expect(album.photoCount, album.id).toBe(10);
      expect(album.photos.every((photo) => photo.kind === 'stock')).toBe(true);
    }
  });

  it('shares no photo between two albums', () => {
    const files = albums.flatMap((album) =>
      album.photos.map((photo) => (photo.kind === 'stock' ? photo.file : '')),
    );
    expect(new Set(files).size).toBe(files.length);
  });

  it('visits the places of each trip in the order it went', () => {
    const cityOfAlbum = new Map(
      cities.flatMap((city) => city.albums.map((album) => [album.id, city.key] as const)),
    );
    const route = (index: number) =>
      (demo.trips[index]?.albumIds ?? [])
        .map((id) => albums.find((album) => album.id === id))
        .filter((album) => album !== undefined)
        .sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day)
        .map((album) => cityOfAlbum.get(album.id));
    expect(route(0)).toEqual(['sevastopol', 'athens', 'valletta', 'lisbon']);
    expect(route(1)).toEqual([
      'rio-de-janeiro',
      'montevideo',
      'bellingshausen-station',
      'buenos-aires',
      'montevideo',
      'rio-de-janeiro',
      'kaliningrad',
    ]);
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
