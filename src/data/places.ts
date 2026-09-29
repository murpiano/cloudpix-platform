import type { Archive } from './archive';
import type { Place } from './types';

/** A place the picker offers: from the map (then it carries its city key) or from the list. */
export interface PickedPlace extends Place {
  cityKey?: string;
}

// [name, country, ISO 3166 numeric, lat, lon] — about 70 cities, enough to pick a home base.
const RAW: [string, string, string, number, number][] = [
  ['Kyiv', 'Ukraine', '804', 50.45, 30.52],
  ['Lviv', 'Ukraine', '804', 49.84, 24.03],
  ['Odesa', 'Ukraine', '804', 46.48, 30.72],
  ['Warsaw', 'Poland', '616', 52.23, 21.01],
  ['Kraków', 'Poland', '616', 50.06, 19.94],
  ['Berlin', 'Germany', '276', 52.52, 13.4],
  ['Munich', 'Germany', '276', 48.14, 11.58],
  ['Hamburg', 'Germany', '276', 53.55, 9.99],
  ['Prague', 'Czechia', '203', 50.08, 14.44],
  ['Vienna', 'Austria', '040', 48.21, 16.37],
  ['Budapest', 'Hungary', '348', 47.5, 19.04],
  ['Amsterdam', 'Netherlands', '528', 52.37, 4.9],
  ['Brussels', 'Belgium', '056', 50.85, 4.35],
  ['London', 'United Kingdom', '826', 51.51, -0.13],
  ['Edinburgh', 'United Kingdom', '826', 55.95, -3.19],
  ['Dublin', 'Ireland', '372', 53.35, -6.26],
  ['Paris', 'France', '250', 48.86, 2.35],
  ['Nice', 'France', '250', 43.7, 7.27],
  ['Lyon', 'France', '250', 45.76, 4.84],
  ['Zurich', 'Switzerland', '756', 47.38, 8.54],
  ['Milan', 'Italy', '380', 45.46, 9.19],
  ['Naples', 'Italy', '380', 40.85, 14.27],
  ['Rome', 'Italy', '380', 41.9, 12.5],
  ['Madrid', 'Spain', '724', 40.42, -3.7],
  ['Valencia', 'Spain', '724', 39.47, -0.38],
  ['Barcelona', 'Spain', '724', 41.39, 2.17],
  ['Lisbon', 'Portugal', '620', 38.72, -9.14],
  ['Athens', 'Greece', '300', 37.98, 23.73],
  ['Valletta', 'Malta', '470', 35.9, 14.51],
  ['Saint Petersburg', 'Russia', '643', 59.93, 30.34],
  ['Kaliningrad', 'Russia', '643', 54.71, 20.51],
  ['Montevideo', 'Uruguay', '858', -34.9, -56.16],
  ['Istanbul', 'Turkey', '792', 41.01, 28.98],
  ['Copenhagen', 'Denmark', '208', 55.68, 12.57],
  ['Stockholm', 'Sweden', '752', 59.33, 18.07],
  ['Oslo', 'Norway', '578', 59.91, 10.75],
  ['Helsinki', 'Finland', '246', 60.17, 24.94],
  ['Tallinn', 'Estonia', '233', 59.44, 24.75],
  ['Riga', 'Latvia', '428', 56.95, 24.11],
  ['Vilnius', 'Lithuania', '440', 54.69, 25.28],
  ['Tbilisi', 'Georgia', '268', 41.72, 44.79],
  ['Yerevan', 'Armenia', '051', 40.18, 44.51],
  ['Dubai', 'United Arab Emirates', '784', 25.2, 55.27],
  ['Cairo', 'Egypt', '818', 30.04, 31.24],
  ['Marrakesh', 'Morocco', '504', 31.63, -8.0],
  ['Cape Town', 'South Africa', '710', -33.92, 18.42],
  ['Nairobi', 'Kenya', '404', -1.29, 36.82],
  ['Delhi', 'India', '356', 28.61, 77.21],
  ['Mumbai', 'India', '356', 19.08, 72.88],
  ['Bangkok', 'Thailand', '764', 13.76, 100.5],
  ['Singapore', 'Singapore', '702', 1.35, 103.82],
  ['Bali', 'Indonesia', '360', -8.65, 115.22],
  ['Seoul', 'South Korea', '410', 37.57, 126.98],
  ['Tokyo', 'Japan', '392', 35.68, 139.69],
  ['Kyoto', 'Japan', '392', 35.01, 135.77],
  ['Beijing', 'China', '156', 39.9, 116.4],
  ['Hong Kong', 'China', '156', 22.32, 114.17],
  ['Sydney', 'Australia', '036', -33.87, 151.21],
  ['Melbourne', 'Australia', '036', -37.81, 144.96],
  ['Auckland', 'New Zealand', '554', -36.85, 174.76],
  ['New York', 'United States', '840', 40.71, -74.0],
  ['Los Angeles', 'United States', '840', 34.05, -118.24],
  ['San Francisco', 'United States', '840', 37.77, -122.42],
  ['Chicago', 'United States', '840', 41.88, -87.63],
  ['Miami', 'United States', '840', 25.76, -80.19],
  ['Toronto', 'Canada', '124', 43.65, -79.38],
  ['Vancouver', 'Canada', '124', 49.28, -123.12],
  ['Mexico City', 'Mexico', '484', 19.43, -99.13],
  ['Havana', 'Cuba', '192', 23.11, -82.37],
  ['Bogotá', 'Colombia', '170', 4.71, -74.07],
  ['Lima', 'Peru', '604', -12.05, -77.04],
  ['Cusco', 'Peru', '604', -13.53, -71.97],
  ['Rio de Janeiro', 'Brazil', '076', -22.91, -43.17],
  ['Buenos Aires', 'Argentina', '032', -34.6, -58.38],
  ['Santiago', 'Chile', '152', -33.45, -70.67],
  ['Reykjavík', 'Iceland', '352', 64.15, -21.94],
];

export const GAZETTEER: Place[] = RAW.map(([name, country, countryId, lat, lon]) => ({
  name,
  country,
  countryId,
  lat,
  lon,
}));

const LIMIT = 8;

/** The places to pick from: the ones already on the map first, then the built-in list. */
export const searchPlaces = (archive: Archive, query: string): PickedPlace[] => {
  const mine: PickedPlace[] = archive.countries.flatMap((country) =>
    country.cities.map((city) => ({
      name: city.name,
      country: country.name,
      countryId: country.id,
      lat: city.lat,
      lon: city.lon,
      cityKey: city.key,
    })),
  );
  const seen = new Set(mine.map((place) => `${place.name}|${place.country}`));
  const all = [...mine, ...GAZETTEER.filter((place) => !seen.has(`${place.name}|${place.country}`))];
  const needle = query.trim().toLowerCase();
  const hits = needle
    ? all.filter(
        (place) =>
          place.name.toLowerCase().includes(needle) || place.country.toLowerCase().includes(needle),
      )
    : all;
  return hits.slice(0, LIMIT);
};
