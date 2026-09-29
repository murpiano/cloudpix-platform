import { pad2 } from '@/lib/math';
import { seedOf, slugOf } from './order';
import type { AlbumData, ArchiveData, CountryData, Credit, PhotoRef, Place, Trip } from './types';

type RawAlbum = [title: string, year: number, month: number, photoCount: number];

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

/** The demo traveller lives in Kyiv. */
export const DEMO_HOME: Place = {
  name: 'Kyiv',
  country: 'Ukraine',
  countryId: '804',
  lat: 50.45,
  lon: 30.52,
};

const COUNTRIES: RawCountry[] = [
  {
    id: '724',
    name: 'Spain',
    cities: [
      {
        name: 'Barcelona',
        key: 'barcelona',
        lat: 41.39,
        lon: 2.17,
        albums: [
          ['Gaudí & the sea', 2019, 3, 64],
          ['New Year on the roof', 2023, 12, 38],
          ['Sagrada Família, finally', 2023, 6, 52],
        ],
      },
      {
        name: 'Madrid',
        key: 'madrid',
        lat: 40.42,
        lon: -3.7,
        albums: [['Prado afternoons', 2021, 10, 41]],
      },
      {
        name: 'Seville',
        key: 'seville',
        lat: 37.39,
        lon: -5.98,
        albums: [['Orange trees in March', 2024, 3, 69]],
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
        albums: [
          ['Tram 28', 2019, 4, 52],
          ['Pastéis and tiles', 2021, 8, 31],
        ],
      },
      {
        name: 'Porto',
        key: 'porto',
        lat: 41.15,
        lon: -8.61,
        albums: [['Rain on the Douro', 2022, 11, 33]],
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
        albums: [
          ['Seven hills, one week', 2018, 5, 88],
          ['Trastevere nights', 2024, 10, 44],
        ],
      },
      {
        name: 'Florence',
        key: 'florence',
        lat: 43.77,
        lon: 11.25,
        albums: [['Duomo at dawn', 2018, 5, 27]],
      },
      {
        name: 'Venice',
        key: 'venice',
        lat: 45.44,
        lon: 12.33,
        albums: [['Fog and gondolas', 2025, 1, 46]],
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
        albums: [
          ['First trip abroad', 2016, 7, 120],
          ['Paris again', 2022, 4, 35],
          ['Louvre at closing time', 2022, 4, 29],
          ['Montmartre sketches', 2025, 9, 40],
        ],
      },
    ],
  },
  {
    id: '352',
    name: 'Iceland',
    cities: [
      {
        name: 'Reykjavík',
        key: 'reykjavik',
        lat: 64.15,
        lon: -21.94,
        albums: [['Midnight sun', 2020, 6, 58]],
      },
      {
        name: 'Vík',
        key: 'vik-i-myrdal',
        lat: 63.42,
        lon: -19.0,
        albums: [['Black sand', 2020, 6, 44]],
      },
    ],
  },
  {
    id: '578',
    name: 'Norway',
    cities: [
      {
        name: 'Bergen',
        key: 'bergen',
        lat: 60.39,
        lon: 5.32,
        albums: [['Fjords by ferry', 2021, 7, 61]],
      },
      {
        name: 'Tromsø',
        key: 'tromso',
        lat: 69.65,
        lon: 18.96,
        albums: [['Chasing the aurora', 2024, 1, 93]],
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
        albums: [
          ['Neon and quiet', 2023, 4, 140],
          ['Shibuya crossing', 2025, 11, 63],
        ],
      },
      {
        name: 'Kyoto',
        key: 'kyoto',
        lat: 35.01,
        lon: 135.77,
        albums: [
          ['Sakura week', 2023, 4, 97],
          ['Autumn temples', 2025, 11, 54],
          ['Bamboo grove', 2023, 4, 38],
        ],
      },
    ],
  },
  {
    id: '554',
    name: 'New Zealand',
    cities: [
      {
        name: 'Auckland',
        key: 'auckland',
        lat: -36.85,
        lon: 174.76,
        albums: [['Harbour city', 2024, 2, 29]],
      },
      {
        name: 'Queenstown',
        key: 'queenstown-new-zealand',
        lat: -45.03,
        lon: 168.66,
        albums: [['Southern Alps road trip', 2024, 2, 131]],
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
        albums: [['Wine and balconies', 2022, 9, 48]],
      },
    ],
  },
  {
    id: '504',
    name: 'Morocco',
    cities: [
      {
        name: 'Marrakesh',
        key: 'marrakesh',
        lat: 31.63,
        lon: -8.0,
        albums: [['Souks and saffron', 2021, 12, 57]],
      },
    ],
  },
  {
    id: '840',
    name: 'United States',
    cities: [
      {
        name: 'New York',
        key: 'manhattan',
        lat: 40.71,
        lon: -74.0,
        albums: [['Seven days in Manhattan', 2017, 10, 102]],
      },
      {
        name: 'San Francisco',
        key: 'san-francisco',
        lat: 37.77,
        lon: -122.42,
        albums: [['Fog over the bridge', 2017, 10, 45]],
      },
    ],
  },
  {
    id: '604',
    name: 'Peru',
    cities: [
      {
        name: 'Cusco',
        key: 'cusco',
        lat: -13.53,
        lon: -71.97,
        albums: [['Up to Machu Picchu', 2025, 7, 76]],
      },
    ],
  },
];

/** The demo trips: a name and the titles of the albums it ties together. */
const TRIPS: [name: string, albumTitles: string[]][] = [
  ['First time abroad', ['First trip abroad']],
  ['American autumn', ['Seven days in Manhattan', 'Fog over the bridge']],
  ['Italy by train', ['Seven hills, one week', 'Duomo at dawn']],
  ['Iberian spring', ['Gaudí & the sea', 'Tram 28']],
  ['Iceland in June', ['Midnight sun', 'Black sand']],
  ['Fjords by ferry', ['Fjords by ferry']],
  ['Lisbon, again', ['Pastéis and tiles']],
  ['A weekend in Madrid', ['Prado afternoons']],
  ['Marrakesh before New Year', ['Souks and saffron']],
  ['Paris in April', ['Paris again', 'Louvre at closing time']],
  ['Tbilisi', ['Wine and balconies']],
  ['Porto in the rain', ['Rain on the Douro']],
  ['Japan in bloom', ['Neon and quiet', 'Sakura week', 'Bamboo grove']],
  ['Barcelona summer', ['Sagrada Família, finally']],
  ['New Year in Barcelona', ['New Year on the roof']],
  ['Chasing the aurora', ['Chasing the aurora']],
  ['New Zealand road trip', ['Harbour city', 'Southern Alps road trip']],
  ['Seville in March', ['Orange trees in March']],
  ['Rome in October', ['Trastevere nights']],
  ['Venice in fog', ['Fog and gondolas']],
  ['Peru', ['Up to Machu Picchu']],
  ['Paris, sketching', ['Montmartre sketches']],
  ['Japan in autumn', ['Autumn temples', 'Shibuya crossing']],
];

/** Demo albums get a day and a time of their own, so a trip keeps its order. */
const albumOf = (cityKey: string, [title, year, month, photoCount]: RawAlbum): AlbumData => {
  const seed = seedOf(title);
  return {
    id: `${cityKey}/${slugOf(title)}`,
    title,
    year,
    month,
    day: 1 + (seed % 26),
    time: `${pad2(8 + (seed % 12))}:${pad2((seed >>> 4) % 60)}`,
    photoCount,
    photos: [],
  };
};

/**
 * Builds the demo archive from the photo credits. Each album of a city starts from a different
 * stock photo of that city, so two albums of one city never open on the same picture.
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
          const shift = pool.length > 0 ? index % pool.length : 0;
          const photos = [...pool.slice(shift), ...pool.slice(0, shift)].map(
            (credit): PhotoRef => ({ kind: 'stock', file: credit.file }),
          );
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
