import { geoDistance } from 'd3-geo';
import { within } from '@/timeline/range';
import type { Range } from '@/timeline/range';
import { EARTH_KM } from '@/tour/flight';
import type { Archive } from './archive';

export interface Stats {
  countries: number;
  totalCountries: number;
  photos: number;
  km: number;
  /** What is counted: everything, the picked range, or the albums up to the one in focus. */
  scope: 'all' | 'range' | 'so far';
}

/** The header's stats: countries, photos and km flown, in the range or so far. */
export const journeyStats = (
  archive: Archive,
  times: readonly number[],
  range: Range | null,
  focus: number,
): Stats => {
  const seen = range
    ? archive.albums.filter((_, i) => within(times[i] ?? 0, range))
    : focus < 0
      ? archive.albums
      : archive.albums.slice(0, focus + 1);
  let km = 0;
  for (let k = 1; k < seen.length; k++) {
    const a = seen[k - 1]?.city;
    const b = seen[k]?.city;
    if (a && b) km += geoDistance([a.lon, a.lat], [b.lon, b.lat]) * EARTH_KM;
  }
  return {
    countries: new Set(seen.map((album) => album.city.country.id)).size,
    totalCountries: archive.countries.filter((c) => c.cities.some((city) => city.albums.length > 0))
      .length,
    photos: seen.reduce((sum, album) => sum + album.photoCount, 0),
    km: Math.round(km),
    scope: range ? 'range' : focus < 0 ? 'all' : 'so far',
  };
};
