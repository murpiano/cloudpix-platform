import { plain } from './places';
import type { Listed } from './places';

/** `public/data/cities.json`: the cities of the world, biggest first, from GeoNames. */
export interface CityFile {
  /** ISO 3166 numeric code (as the world map has it), English name. */
  countries: [id: string, name: string][];
  /** Name, its plain-letter form when that differs, index into `countries`, latitude, longitude. */
  cities: [name: string, ascii: string, country: number, lat: number, lon: number][];
}

export const parseCities = (file: CityFile): Listed[] =>
  file.cities.flatMap(([name, ascii, index, lat, lon]) => {
    const country = file.countries[index];
    if (!country) return [];
    const city = ascii ? `${plain(name)} ${plain(ascii)}` : plain(name);
    return [
      {
        name,
        country: country[1],
        countryId: country[0],
        lat,
        lon,
        find: `${city}|${plain(country[1])}`,
        at: city.length,
      },
    ];
  });

let loading: Promise<Listed[]> | null = null;

/** Fetches the list of cities once; a failed fetch is tried again on the next ask. */
export const loadCities = (): Promise<Listed[]> => {
  loading ??= fetch(`${import.meta.env.BASE_URL}data/cities.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`cities.json: HTTP ${response.status}`);
      return response.json() as Promise<CityFile>;
    })
    .then(parseCities)
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
};
