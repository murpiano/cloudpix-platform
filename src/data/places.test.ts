import { describe, expect, it } from 'vitest';
import { linkArchive } from './archive';
import { browsePlaces, GAZETTEER, listed, listPlaces, searchPlaces } from './places';
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

describe('searchPlaces in a long list', () => {
  const list = listPlaces(
    [
      { name: 'São Paulo', country: 'Brazil', countryId: '076', lat: -23.55, lon: -46.63 },
      { name: 'Paris', country: 'France', countryId: '250', lat: 48.85, lon: 2.35 },
      { name: 'Parma', country: 'Italy', countryId: '380', lat: 44.8, lon: 10.33 },
      { name: 'New York City', country: 'United States', countryId: '840', lat: 40.71, lon: -74 },
      { name: 'Reykjavík', country: 'Iceland', countryId: '352', lat: 64.15, lon: -21.94 },
      { name: 'Kyiv', country: 'Ukraine', countryId: '804', lat: 50.45, lon: 30.52 },
      { name: 'Milan', country: 'Italy', countryId: '380', lat: 45.46, lon: 9.19 },
    ],
    ['Sao Paulo', '', '', '', '', '', ''],
  );
  const empty = linkArchive({ countries: [], trips: [] });
  const names = (query: string) => searchPlaces(empty, query, list).map((place) => place.name);

  it('finds a city typed without its accents, or by its plain-letter name', () => {
    expect(names('reykjavik')).toEqual(['Reykjavík']);
    expect(names('sao paulo')).toEqual(['São Paulo']);
    expect(names('SÃO')).toEqual(['São Paulo']);
  });

  it('puts a city that starts with the text before one that only contains it', () => {
    expect(names('par')).toEqual(['Paris', 'Parma']);
    // "ar" starts no city and sits inside two of them
    expect(names('ar')).toEqual(['Paris', 'Parma']);
    expect(names('ma')).toEqual(['Parma']);
  });

  it('finds a city by a word inside its name, and by its country last', () => {
    expect(names('york')).toEqual(['New York City']);
    expect(names('italy')).toEqual(['Parma', 'Milan']);
  });

  it('shows the biggest cities, the head of the list, for an empty box', () => {
    expect(names('')).toHaveLength(7);
    expect(names('')[0]).toBe('São Paulo');
  });

  it('leaves out a city the map already has under the same name', () => {
    const own = linkArchive(data());
    const found = searchPlaces(own, 'paris', list);
    expect(found.filter((place) => place.name === 'Paris')).toHaveLength(1);
    expect(found[0]?.cityKey).toBe('paris');
  });
});

describe('searchPlaces in Russian, and browsing', () => {
  const list = [
    listed(
      { name: 'Saint Petersburg', country: 'Russia', countryId: '643', lat: 59.94, lon: 30.31 },
      { ru: 'Санкт-Петербург', countryRu: 'Россия' },
    ),
    listed(
      { name: 'Moscow', country: 'Russia', countryId: '643', lat: 55.75, lon: 37.62 },
      { ru: 'Москва', countryRu: 'Россия' },
    ),
    listed(
      { name: 'Yoshkar-Ola', country: 'Russia', countryId: '643', lat: 56.63, lon: 47.89 },
      { ru: 'Йошкар-Ола', countryRu: 'Россия' },
    ),
    listed(
      { name: 'Berlin', country: 'Germany', countryId: '276', lat: 52.52, lon: 13.4 },
      { ru: 'Берлин', countryRu: 'Германия' },
    ),
    listed({ name: 'Ávila', country: 'Spain', countryId: '724', lat: 40.66, lon: -4.7 }),
  ];
  const empty = linkArchive({ countries: [], trips: [] });
  const names = (query: string) => searchPlaces(empty, query, list, 50).map((place) => place.name);

  it('understands the Russian name, in any case, and "ё" for "е", "й" for "и"', () => {
    expect(names('санкт')).toEqual(['Saint Petersburg']);
    expect(names('МОСКВ')).toEqual(['Moscow']);
    expect(names('йошкар')).toEqual(['Yoshkar-Ola']);
    expect(names('ёшкар')).toEqual([]);
    expect(names('берл')).toEqual(['Berlin']);
  });

  it('understands the Russian name of a country', () => {
    expect(names('россия')).toEqual(['Saint Petersburg', 'Moscow', 'Yoshkar-Ola']);
  });

  it('shows the Russian name beside the place, and only for the ones that have it', () => {
    expect(searchPlaces(empty, 'москва', list)[0]?.ru).toBe('Москва');
    expect(searchPlaces(empty, 'avila', list)[0]?.ru).toBeUndefined();
  });

  it('finds a city of the map by its Russian name too, and lists it once', () => {
    const map = linkArchive({
      countries: [
        {
          id: '643',
          name: 'Russia',
          cities: [{ key: 'moscow', name: 'Moscow', lat: 55.75, lon: 37.62, albums: [] }],
        },
      ],
      trips: [],
    });
    const found = searchPlaces(map, 'москв', list);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ name: 'Moscow', cityKey: 'moscow', ru: 'Москва' });
  });

  it('browses every city in alphabetical order, the ones on the map first', () => {
    const map = linkArchive({
      countries: [
        {
          id: '276',
          name: 'Germany',
          cities: [
            {
              key: 'berlin',
              name: 'Berlin',
              lat: 52.52,
              lon: 13.4,
              albums: [],
            },
          ],
        },
      ],
      trips: [],
    });
    const all = browsePlaces(map, list).map((place) => place.name);
    expect(all).toEqual(['Berlin', 'Ávila', 'Moscow', 'Saint Petersburg', 'Yoshkar-Ola']);
    expect(browsePlaces(empty, list)).toHaveLength(5);
  });
});
