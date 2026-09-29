import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { linkArchive } from '@/data/archive';
import { buildDemo } from '@/data/demo';
import type { Credit } from '@/data/types';
import { albumTime, yearRange } from '@/timeline/range';
import { cityAlbums, nextInRange, nextStep, scopedAlbums, tripTour, yearTour } from './tour';

const file = fileURLToPath(new URL('../../public/demo/photos.json', import.meta.url));
const archive = linkArchive(buildDemo(JSON.parse(readFileSync(file, 'utf8')) as Credit[]));
const times = archive.albums.map(albumTime);
const titles = (list: number[]) => list.map((i) => archive.albums[i]?.title);
const tripNamed = (name: string) => {
  const trip = archive.trips.find((t) => t.name === name);
  if (!trip) throw new Error(name);
  return trip;
};

describe('tours', () => {
  it('goes through a year in date order', () => {
    const tour = yearTour(2020, archive);
    expect(tour?.kind).toBe('year');
    expect(tour?.end).toBeNull();
    expect(tour?.list).toHaveLength(5);
    expect(tour?.list).toEqual([...(tour?.list ?? [])].sort((a, b) => a - b));
    expect(yearTour(1999, archive)).toBeNull();
  });

  it('goes through a trip in date order and knows where it ends', () => {
    const tour = tripTour(tripNamed('South America and the ice'), archive);
    expect(titles(tour?.list ?? [])).toEqual([
      'Christ over the clouds',
      'Rambla at dusk',
      'The end of the world',
      'Tango in La Boca',
      'Montevideo again',
      'Back to Rio',
      'Amber coast',
    ]);
    expect(tour?.end).toEqual({ home: true });
    expect(tour?.tripId).toBe(tripNamed('South America and the ice').id);
  });
});

describe('nextStep', () => {
  it('visits the next album of a trip, then flies to its end', () => {
    const tour = tripTour(tripNamed('South America and the ice'), archive);
    if (!tour) throw new Error('no tour');
    const first = tour.list[0];
    const second = tour.list[1];
    const last = tour.list[tour.list.length - 1];
    expect(nextStep(tour, first ?? -1, times, null)).toEqual({ kind: 'album', index: second });
    expect(nextStep(tour, last ?? -1, times, null)).toEqual({ kind: 'end', end: { home: true } });
  });

  it('stops a year at its last album', () => {
    const tour = yearTour(2020, archive);
    if (!tour) throw new Error('no tour');
    expect(nextStep(tour, tour.list[tour.list.length - 1] ?? -1, times, null)).toEqual({
      kind: 'stop',
    });
  });

  it('plays on through the range with no tour, and stops at its end', () => {
    const range = yearRange(2019);
    const inRange = times.flatMap((t, i) => (t >= 2019 && t < 2020 ? [i] : []));
    expect(nextStep(null, -1, times, range)).toEqual({ kind: 'album', index: inRange[0] });
    expect(nextStep(null, inRange[inRange.length - 1] ?? -1, times, range)).toEqual({
      kind: 'stop',
    });
  });

  it('steps back through the range too', () => {
    const range = yearRange(2019);
    const inRange = times.flatMap((t, i) => (t >= 2019 && t < 2020 ? [i] : []));
    expect(nextInRange(inRange[1] ?? -1, -1, times, range)).toBe(inRange[0]);
    expect(nextInRange(inRange[0] ?? -1, -1, times, range)).toBe(-1);
  });
});

describe('scopedAlbums', () => {
  it('keeps to the tour, or shows every album of the place', () => {
    const montevideo = cityAlbums(archive, 'montevideo');
    expect(montevideo).toHaveLength(2);
    const december = yearTour(2019, archive);
    expect(titles(scopedAlbums(montevideo, december))).toEqual(['Rambla at dusk']);
    expect(scopedAlbums(montevideo, null)).toEqual(montevideo);
    const autumn = tripTour(tripNamed('Mediterranean autumn'), archive);
    expect(scopedAlbums(montevideo, autumn)).toEqual(montevideo);
  });
});
