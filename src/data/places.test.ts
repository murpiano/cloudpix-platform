import { describe, expect, it } from 'vitest';
import { linkArchive } from './archive';
import { GAZETTEER, searchPlaces } from './places';
import type { ArchiveData } from './types';

const data = (): ArchiveData => ({
  countries: [
    {
      id: '250',
      name: 'France',
      cities: [
        {
          key: 'paris',
          name: 'Paris',
          lat: 48.86,
          lon: 2.35,
          albums: [
            {
              id: 'a1',
              title: 'Roofs',
              year: 2022,
              month: 5,
              day: 3,
              time: '10:00',
              photoCount: 2,
              photos: [],
            },
          ],
        },
      ],
    },
  ],
  trips: [],
});

describe('searchPlaces', () => {
  it('puts the places already on the map first', () => {
    const found = searchPlaces(linkArchive(data()), '');
    expect(found[0]).toMatchObject({ name: 'Paris', country: 'France', cityKey: 'paris' });
    expect(found).toHaveLength(8);
  });

  it('lists a city on the map once, not twice', () => {
    const found = searchPlaces(linkArchive(data()), 'paris');
    expect(found.filter((place) => place.name === 'Paris')).toHaveLength(1);
    expect(found[0]?.cityKey).toBe('paris');
  });

  it('matches the country as well as the city', () => {
    const found = searchPlaces(linkArchive(data()), 'japan');
    expect(found.map((place) => place.name)).toContain('Tokyo');
  });

  it('gives every gazetteer place a country code the world map knows', () => {
    for (const place of GAZETTEER) {
      expect(place.countryId).toMatch(/^\d{3}$/);
    }
  });
});
