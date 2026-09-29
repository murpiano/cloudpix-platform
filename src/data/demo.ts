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
    ],
  },
];

/** The demo trips: a name and the titles of the albums it ties together. */
const TRIPS: [name: string, albumTitles: string[]][] = [
  ['Mediterranean autumn', ['Acropolis at sunrise', 'Honey-coloured Valletta', 'Tram 28 and tiles']],
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
