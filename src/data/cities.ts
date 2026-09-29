import { listed } from './places';
import type { Listed } from './places';

/** `public/data/cities.json`: the cities of the world, biggest first, from GeoNames. */
export interface CityFile {
  /** ISO 3166 numeric code (as the world map has it), English name, Russian name or nothing. */
  countries: [id: string, name: string, ru: string][];
  /** Name, plain-letter name or nothing, Russian name or nothing, country index, latitude, longitude. */
  cities: [name: string, ascii: string, ru: string, country: number, lat: number, lon: number][];
}

export const parseCities = (file: CityFile): Listed[] =>
  file.cities.flatMap(([name, ascii, ru, index, lat, lon]) => {
    const country = file.countries[index];
    if (!country) return [];
    return [
      listed(
        { name, country: country[1], countryId: country[0], lat, lon },
        { ascii, ru, countryRu: country[2] },
      ),
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
