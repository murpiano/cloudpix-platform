import { describe, expect, it } from 'vitest';
import {
  addAlbum,
  addPhotos,
  addTrip,
  cityFor,
  deleteAlbum,
  deleteTrip,
  freshId,
  removePhoto,
  setCaption,
  updateAlbum,
  updateTrip,
} from './edits';
import type { AlbumFields } from './edits';
import type { ArchiveData, PhotoRef } from './types';

const PARIS = { name: 'Paris', country: 'France', countryId: '250', lat: 48.86, lon: 2.35 };
const ROME = { name: 'Rome', country: 'Italy', countryId: '380', lat: 41.9, lon: 12.5 };

const fields = (over: Partial<AlbumFields> = {}): AlbumFields => ({
  title: 'Roofs',
  year: 2022,
  month: 5,
  day: 3,
  time: '10:00',
  place: PARIS,
  tripId: null,
  ...over,
});

const empty = (): ArchiveData => ({ countries: [], trips: [] });

describe('freshId', () => {
  it('makes an id with the prefix, the time and some noise', () => {
    expect(freshId('u', 1_700_000_000_000, () => 0.5)).toMatch(/^u[a-z0-9]+$/);
    expect(freshId('u', 1, () => 0.1)).not.toBe(freshId('u', 1, () => 0.9));
  });
});

describe('cityFor', () => {
  it('makes the country and the city when the place is new', () => {
    const data = empty();
    const city = cityFor(data, PARIS);
    expect(city).toMatchObject({ key: 'paris', name: 'Paris', albums: [] });
    expect(data.countries.map((country) => country.id)).toEqual(['250']);
  });

  it('gives back the city the place already points at', () => {
    const data = empty();
    const first = cityFor(data, PARIS);
    addAlbum(data, 'a1', fields());
    expect(cityFor(data, { ...PARIS, cityKey: 'paris' })).toBe(first);
    expect(data.countries).toHaveLength(1);
  });

  it('keeps two cities of the same name in different countries apart', () => {
    const data = empty();
    const one = cityFor(data, {
      name: 'Santiago',
      country: 'Chile',
      countryId: '152',
      lat: -33.45,
      lon: -70.67,
    });
    const two = cityFor(data, {
      name: 'Santiago',
      country: 'Cuba',
      countryId: '192',
      lat: 20.02,
      lon: -75.82,
    });
    expect(one).not.toBe(two);
    expect(one.key).not.toBe(two.key);
  });
});

describe('albums', () => {
  it('adds an album to its city with no photos yet', () => {
    const data = empty();
    const album = addAlbum(data, 'a1', fields());
    expect(album).toMatchObject({ id: 'a1', title: 'Roofs', photoCount: 0, photos: [] });
    expect(data.countries[0]?.cities[0]?.albums).toEqual([album]);
  });

  it('puts a new album into the trip it was given', () => {
    const data = empty();
    addTrip(data, 't1', {
      name: 'Spring',
      start: { home: true },
      end: { home: true },
      albumIds: [],
    });
    addAlbum(data, 'a1', fields({ tripId: 't1' }));
    expect(data.trips[0]?.albumIds).toEqual(['a1']);
  });

  it('moves the album when its place changes, and only then', () => {
    const data = empty();
    addAlbum(data, 'a1', fields());
    updateAlbum(data, 'a1', fields({ title: 'Roofs again' }));
    expect(data.countries).toHaveLength(1);
    updateAlbum(data, 'a1', fields({ place: ROME }));
    const cities = data.countries.flatMap((country) => country.cities);
    expect(cities.find((city) => city.key === 'paris')?.albums).toEqual([]);
    expect(cities.find((city) => city.key === 'rome')?.albums[0]?.title).toBe('Roofs');
  });

  it('takes the album out of its old trip when the trip changes', () => {
    const data = empty();
    addTrip(data, 't1', {
      name: 'Spring',
      start: { home: true },
      end: { home: true },
      albumIds: [],
    });
    addTrip(data, 't2', {
      name: 'Autumn',
      start: { home: true },
      end: { home: true },
      albumIds: [],
    });
    addAlbum(data, 'a1', fields({ tripId: 't1' }));
    updateAlbum(data, 'a1', fields({ tripId: 't2' }));
    expect(data.trips[0]?.albumIds).toEqual([]);
    expect(data.trips[1]?.albumIds).toEqual(['a1']);
  });

  it('deletes the album, drops it from its trip and hands back its photos', () => {
    const data = empty();
    addTrip(data, 't1', {
      name: 'Spring',
      start: { home: true },
      end: { home: true },
      albumIds: [],
    });
    addAlbum(data, 'a1', fields({ tripId: 't1' }));
    const own: PhotoRef = { kind: 'own', id: 'p1', name: 'one.jpg' };
    addPhotos(data, 'a1', [own]);
    expect(deleteAlbum(data, 'a1')).toEqual([own]);
    expect(data.countries[0]?.cities[0]?.albums).toEqual([]);
    expect(data.trips[0]?.albumIds).toEqual([]);
  });
});

describe('photos', () => {
  const albumOf = (data: ArchiveData) => data.countries[0]?.cities[0]?.albums[0];
  const withPhoto = (): ArchiveData => {
    const data = empty();
    addAlbum(data, 'a1', fields());
    addPhotos(data, 'a1', [{ kind: 'own', id: 'p1', name: 'one.jpg' }]);
    return data;
  };

  it('counts the photos it adds', () => {
    expect(albumOf(withPhoto())).toMatchObject({ photoCount: 1 });
  });

  it('never counts fewer photos than it carries', () => {
    const data = empty();
    addAlbum(data, 'a1', fields());
    const album = albumOf(data);
    if (album) album.photoCount = 40;
    addPhotos(data, 'a1', [{ kind: 'own', id: 'p1', name: 'one.jpg' }]);
    expect(removePhoto(data, 'a1', 'p1')).toEqual({ kind: 'own', id: 'p1', name: 'one.jpg' });
    expect(albumOf(data)?.photoCount).toBe(40);
    expect(albumOf(data)?.photos).toEqual([]);
  });

  it('writes a caption, and an empty one takes it away', () => {
    const data = withPhoto();
    setCaption(data, 'a1', 'p1', '  Early light  ');
    expect(albumOf(data)?.photos[0]?.caption).toBe('Early light');
    setCaption(data, 'a1', 'p1', '   ');
    expect(albumOf(data)?.photos[0]).not.toHaveProperty('caption');
  });
});

describe('trips', () => {
  it('creates a trip with its albums and takes them from other trips', () => {
    const data = empty();
    addTrip(data, 't1', {
      name: 'Spring',
      start: { home: true },
      end: { home: true },
      albumIds: [],
    });
    addAlbum(data, 'a1', fields({ tripId: 't1' }));
    const trip = addTrip(data, 't2', {
      name: 'Autumn',
      start: { home: true },
      end: { cityKey: 'paris' },
      albumIds: ['a1'],
    });
    expect(trip.end).toEqual({ cityKey: 'paris' });
    expect(data.trips[0]?.albumIds).toEqual([]);
    expect(data.trips[1]?.albumIds).toEqual(['a1']);
  });

  it('rewrites a trip and leaves the albums alone when it is deleted', () => {
    const data = empty();
    addAlbum(data, 'a1', fields());
    addTrip(data, 't1', {
      name: 'Spring',
      start: { home: true },
      end: { home: true },
      albumIds: ['a1'],
    });
    updateTrip(data, 't1', {
      name: 'Spring break',
      start: { cityKey: 'paris' },
      end: { home: true },
      albumIds: [],
    });
    expect(data.trips[0]).toMatchObject({
      name: 'Spring break',
      start: { cityKey: 'paris' },
      albumIds: [],
    });
    const trips = data.trips;
    deleteTrip(data, 't1');
    // the linked archive shares this array: deleting must not swap it for a new one
    expect(data.trips).toBe(trips);
    expect(data.trips).toEqual([]);
    expect(data.countries[0]?.cities[0]?.albums).toHaveLength(1);
  });
});
