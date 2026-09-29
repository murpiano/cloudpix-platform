import { describe, expect, it } from 'vitest';
import { linkArchive } from '@/data/archive';
import type { ArchiveData } from '@/data/types';
import { endpointOf, endpointOptions, endpointValue } from './endpoints';

const HOME = { name: 'Kyiv', country: 'Ukraine', countryId: '804', lat: 50.45, lon: 30.52 };
const data: ArchiveData = {
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
};

describe('the trip endpoints', () => {
  it('offers home first, then the cities on the map', () => {
    const options = endpointOptions(linkArchive(data), HOME);
    expect(options[0]).toEqual({ value: 'home', label: 'Home · Kyiv' });
    expect(options[1]).toEqual({ value: 'paris', label: 'Paris, France' });
  });

  it('reads a value back into an endpoint and writes it out again', () => {
    expect(endpointOf('home')).toEqual({ home: true });
    expect(endpointOf('paris')).toEqual({ cityKey: 'paris' });
    expect(endpointValue({ home: true })).toBe('home');
    expect(endpointValue({ cityKey: 'paris' })).toBe('paris');
  });
});
