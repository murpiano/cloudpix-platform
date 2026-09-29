import { describe, expect, it } from 'vitest';
import { linkArchive, photoTotal, relinkInto, visitYears } from './archive';
import type { AlbumData, ArchiveData } from './types';

const album = (id: string, year: number, month: number, photoCount: number): AlbumData => ({
  id,
  title: id,
  year,
  month,
  day: 1,
  time: '12:00',
  photoCount,
  photos: [],
});

const data: ArchiveData = {
  countries: [
    {
      id: '724',
      name: 'Spain',
      cities: [
        {
          key: 'madrid',
          name: 'Madrid',
          lat: 40.42,
          lon: -3.7,
          albums: [album('m2', 2024, 1, 3), album('m1', 2021, 5, 4), album('m3', 2021, 9, 1)],
        },
        { key: 'empty', name: 'Empty', lat: 0, lon: 0, albums: [] },
      ],
    },
    {
      id: '620',
      name: 'Portugal',
      cities: [
        { key: 'lisbon', name: 'Lisbon', lat: 38.7, lon: -9.1, albums: [album('l1', 2019, 4, 2)] },
      ],
    },
  ],
  trips: [{ id: 't', name: 'Trip', start: { home: true }, end: { home: true }, albumIds: ['m1'] }],
};

describe('linkArchive', () => {
  const archive = linkArchive(data);

  it('links albums to cities and cities to countries', () => {
    const madrid = archive.cityByKey.get('madrid');
    expect(madrid?.country.name).toBe('Spain');
    expect(archive.albumById.get('m1')?.city).toBe(madrid);
  });

  it('lights only cities that hold albums', () => {
    expect(archive.cities.map((city) => city.key)).toEqual(['madrid', 'lisbon']);
  });

  it('lists every album oldest first', () => {
    expect(archive.albums.map((a) => a.id)).toEqual(['l1', 'm1', 'm3', 'm2']);
  });

  it('keeps the trips', () => {
    expect(archive.trips).toBe(data.trips);
  });
});

describe('city helpers', () => {
  const archive = linkArchive(data);
  const madrid = archive.cityByKey.get('madrid');

  it('adds up the photos of a city', () => {
    expect(madrid && photoTotal(madrid)).toBe(8);
  });

  it('lists the years of visits once each, in order', () => {
    expect(madrid && visitYears(madrid)).toEqual([2021, 2024]);
  });
});

describe('relinkInto', () => {
  it('rebuilds the graph in the same object, so everything holding it sees the change', () => {
    const own = structuredClone(data);
    const archive = linkArchive(own);
    const before = archive.albums.length;
    own.countries[0]?.cities[0]?.albums.push(album('new', 2030, 1, 0));
    const albums = archive.albums;
    const cities = archive.cities;
    const byId = archive.albumById;
    const same = relinkInto(archive, own);
    expect(same).toBe(archive);
    // the director and the engine captured these when they were made: they must stay the same
    expect(archive.albums).toBe(albums);
    expect(archive.cities).toBe(cities);
    expect(archive.albumById).toBe(byId);
    expect(archive.albums).toHaveLength(before + 1);
    expect(archive.albumById.get('new')?.title).toBe('new');
  });
});
