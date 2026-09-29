import { pad2 } from '@/lib/math';
import { seedOf, slugOf } from './order';
import type { AlbumData, ArchiveData, CountryData, Credit, PhotoRef, Place, Trip } from './types';

type RawAlbum = [title: string, year: number, month: number, day: number];

interface RawCity {
  name: string;
  key: string;
  lat: number;
  lon: number;
  albums: RawAlbum[];
}

interface RawCountry {
  id: string;
  name: string;
  cities: RawCity[];
}

/** The demo traveller lives in Saint Petersburg. */
export const DEMO_HOME: Place = {
  name: 'Saint Petersburg',
  country: 'Russia',
  countryId: '643',
  lat: 59.93,
  lon: 30.34,
};

/** Every demo album has this many photos, ten of a place's own. */
const PHOTOS_PER_ALBUM = 10;

const COUNTRIES: RawCountry[] = [
  {
    id: '300',
    name: 'Greece',
    cities: [
      {
        name: 'Athens',
        key: 'athens',
        lat: 37.98,
        lon: 23.73,
        albums: [['Acropolis at sunrise', 2016, 9, 12]],
      },
    ],
  },
  {
    id: '470',
    name: 'Malta',
    cities: [
      {
        name: 'Valletta',
        key: 'valletta',
        lat: 35.9,
        lon: 14.51,
        albums: [['Honey-coloured Valletta', 2016, 10, 8]],
      },
    ],
  },
  {
    id: '620',
    name: 'Portugal',
    cities: [
      {
        name: 'Lisbon',
        key: 'lisbon',
        lat: 38.72,
        lon: -9.14,
        albums: [['Tram 28 and tiles', 2016, 11, 6]],
      },
    ],
  },
  {
    id: '076',
    name: 'Brazil',
    cities: [
      {
        name: 'Rio de Janeiro',
        key: 'rio-de-janeiro',
        lat: -22.91,
        lon: -43.17,
        albums: [
          ['Christ over the clouds', 2019, 11, 10],
          ['Back to Rio', 2020, 3, 5],
        ],
      },
    ],
  },
  {
    id: '858',
    name: 'Uruguay',
    cities: [
      {
        name: 'Montevideo',
        key: 'montevideo',
        lat: -34.9,
        lon: -56.16,
        albums: [
          ['Rambla at dusk', 2019, 12, 14],
          ['Montevideo again', 2020, 2, 20],
        ],
      },
    ],
  },
  {
    id: '010',
    name: 'Antarctica',
    cities: [
      {
        name: 'Bellingshausen Station',
        key: 'bellingshausen-station',
        lat: -62.2,
        lon: -58.96,
        albums: [['The end of the world', 2020, 1, 12]],
      },
    ],
  },
  {
    id: '032',
    name: 'Argentina',
    cities: [
      {
        name: 'Buenos Aires',
        key: 'buenos-aires',
        lat: -34.6,
        lon: -58.38,
        albums: [['Tango in La Boca', 2020, 2, 6]],
      },
    ],
  },
  {
    id: '643',
    name: 'Russia',
    cities: [
      {
        name: 'Kaliningrad',
        key: 'kaliningrad',
        lat: 54.71,
        lon: 20.51,
        albums: [['Amber coast', 2020, 4, 15]],
      },
      {
        name: 'Sevastopol',
        key: 'sevastopol',
        lat: 44.62,
        lon: 33.53,
        albums: [['Bays of Sevastopol', 2016, 9, 5]],
      },
    ],
  },
  {
    id: '792',
    name: 'Turkey',
    cities: [
      {
        name: 'Istanbul',
        key: 'istanbul',
        lat: 41.01,
        lon: 28.98,
        albums: [['Two continents by ferry', 2017, 6, 10]],
      },
    ],
  },
  {
    id: '380',
    name: 'Italy',
    cities: [
      {
        name: 'Rome',
        key: 'rome',
        lat: 41.9,
        lon: 12.5,
        albums: [['Seven hills, one week', 2018, 5, 8]],
      },
      {
        name: 'Venice',
        key: 'venice',
        lat: 45.44,
        lon: 12.33,
        albums: [['Fog and gondolas', 2018, 5, 15]],
      },
    ],
  },
  {
    id: '268',
    name: 'Georgia',
    cities: [
      {
        name: 'Tbilisi',
        key: 'tbilisi',
        lat: 41.72,
        lon: 44.79,
        albums: [['Wine and balconies', 2021, 9, 12]],
      },
    ],
  },
  {
    id: '051',
    name: 'Armenia',
    cities: [
      {
        name: 'Yerevan',
        key: 'yerevan',
        lat: 40.18,
        lon: 44.51,
        albums: [['Ararat at dawn', 2022, 8, 9]],
      },
    ],
  },
  {
    id: '250',
    name: 'France',
    cities: [
      {
        name: 'Paris',
        key: 'paris',
        lat: 48.86,
        lon: 2.35,
        albums: [['Paris in the rain', 2023, 4, 5]],
      },
    ],
  },
  {
    id: '528',
    name: 'Netherlands',
    cities: [
      {
        name: 'Amsterdam',
        key: 'amsterdam',
        lat: 52.37,
        lon: 4.9,
        albums: [['Canals and bicycles', 2023, 4, 12]],
      },
    ],
  },
  {
    id: '392',
    name: 'Japan',
    cities: [
      {
        name: 'Tokyo',
        key: 'tokyo',
        lat: 35.68,
        lon: 139.69,
        albums: [['Neon and quiet', 2024, 4, 3]],
      },
      {
        name: 'Kyoto',
        key: 'kyoto',
        lat: 35.01,
        lon: 135.77,
        albums: [['Sakura week', 2024, 4, 10]],
      },
    ],
  },
  {
    id: '840',
    name: 'United States',
    cities: [
      {
        name: 'New York',
        key: 'new-york',
        lat: 40.71,
        lon: -74.0,
        albums: [['Seven days in Manhattan', 2025, 10, 6]],
      },
    ],
  },
  {
    id: '724',
    name: 'Spain',
    cities: [
      {
        name: 'Barcelona',
        key: 'barcelona',
        lat: 41.39,
        lon: 2.17,
        albums: [['Gaudí and the sea', 2026, 3, 14]],
      },
    ],
  },
];

/** The demo trips: a name and the titles of the albums it ties together. */
const TRIPS: [name: string, albumTitles: string[]][] = [
  [
    'Mediterranean autumn',
    ['Bays of Sevastopol', 'Acropolis at sunrise', 'Honey-coloured Valletta', 'Tram 28 and tiles'],
  ],
  [
    'South America and the ice',
    [
      'Christ over the clouds',
      'Rambla at dusk',
      'The end of the world',
      'Tango in La Boca',
      'Montevideo again',
      'Back to Rio',
      'Amber coast',
    ],
  ],
  ['Istanbul in June', ['Two continents by ferry']],
  ['Italy by train', ['Seven hills, one week', 'Fog and gondolas']],
  ['Tbilisi in September', ['Wine and balconies']],
  ['Armenian summer', ['Ararat at dawn']],
  ['Paris and Amsterdam', ['Paris in the rain', 'Canals and bicycles']],
  ['Japan in bloom', ['Neon and quiet', 'Sakura week']],
  ['New York in October', ['Seven days in Manhattan']],
  ['Barcelona in March', ['Gaudí and the sea']],
];

/** A demo album has a day of its own, so a trip keeps its order, and a time from its title. */
const albumOf = (cityKey: string, [title, year, month, day]: RawAlbum): AlbumData => {
  const seed = seedOf(title);
  return {
    id: `${cityKey}/${slugOf(title)}`,
    title,
    year,
    month,
    day,
    time: `${pad2(8 + (seed % 12))}:${pad2((seed >>> 4) % 60)}`,
    photoCount: PHOTOS_PER_ALBUM,
    photos: [],
  };
};

/**
 * Builds the demo archive from the photo credits. A city's photos are dealt out ten to an album, so
 * two albums of one city never share a picture.
 */
export const buildDemo = (credits: Credit[]): ArchiveData => {
  const pools = new Map<string, Credit[]>();
  for (const credit of credits) {
    const key = slugOf(credit.city);
    pools.set(key, [...(pools.get(key) ?? []), credit]);
  }

  const countries: CountryData[] = COUNTRIES.map((country) => ({
    id: country.id,
    name: country.name,
    cities: country.cities.map((city) => {
      const pool = pools.get(city.key) ?? [];
      return {
        key: city.key,
        name: city.name,
        lat: city.lat,
        lon: city.lon,
        albums: city.albums.map((raw, index) => {
          const from = index * PHOTOS_PER_ALBUM;
          const photos = pool
            .slice(from, from + PHOTOS_PER_ALBUM)
            .map((credit): PhotoRef => ({ kind: 'stock', file: credit.file }));
          return { ...albumOf(city.key, raw), photos };
        }),
      };
    }),
  }));

  const albums = countries.flatMap((country) => country.cities).flatMap((city) => city.albums);
  const trips: Trip[] = TRIPS.map(([name, titles], index) => ({
    id: `d${index}`,
    name,
    start: { home: true },
    end: { home: true },
    albumIds: titles
      .map((title) => albums.find((album) => album.title === title)?.id)
      .filter((id): id is string => id !== undefined),
  }));

  return { countries, trips };
};
