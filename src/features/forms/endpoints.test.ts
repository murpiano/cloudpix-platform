import { describe, expect, it } from 'vitest';
import { linkArchive } from '@/data/archive';
import type { ArchiveData } from '@/data/types';
import { endChoiceOf, endpointFor } from './endpoints';

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
              photoCount: 0,
              photos: [],
            },
          ],
        },
      ],
    },
  ],
  trips: [],
});

const LIMA = { name: 'Lima', country: 'Peru', countryId: '604', lat: -12.05, lon: -77.04 };

describe('the trip endpoints', () => {
  it('is home for home, and a city on the map by its key', () => {
    const one = data();
    expect(endpointFor(one, 'home')).toEqual({ home: true });
    expect(
      endpointFor(one, {
        ...LIMA,
        name: 'Paris',
        country: 'France',
        countryId: '250',
        lat: 48.86,
        lon: 2.35,
        cityKey: 'paris',
      }),
    ).toEqual({ cityKey: 'paris' });
    expect(one.countries).toHaveLength(1);
  });

  it('takes any city of the world, and makes it in the archive when it is not there yet', () => {
    const one = data();
    const end = endpointFor(one, LIMA);
    expect(end).toEqual({ cityKey: 'lima' });
    const city = one.countries.find((country) => country.id === '604')?.cities[0];
    expect(city).toMatchObject({ key: 'lima', name: 'Lima', albums: [] });
    // the same city asked again is the same city
    expect(endpointFor(one, LIMA)).toEqual({ cityKey: 'lima' });
    expect(one.countries.find((country) => country.id === '604')?.cities).toHaveLength(1);
  });

  it('reads a stored endpoint back as a choice for the form', () => {
    const archive = linkArchive(data());
    expect(endChoiceOf({ home: true }, archive)).toBe('home');
    expect(endChoiceOf({ cityKey: 'paris' }, archive)).toMatchObject({
      name: 'Paris',
      country: 'France',
      cityKey: 'paris',
    });
    expect(endChoiceOf({ cityKey: 'atlantis' }, archive)).toBe('home');
  });
});
