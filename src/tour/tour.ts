import type { Archive } from '@/data/archive';
import type { Endpoint, Trip } from '@/data/types';
import { within } from '@/timeline/range';
import type { Range } from '@/timeline/range';

/** A year or a trip shown on the map: its albums (indices into archive.albums), in order. */
export interface Tour {
  kind: 'year' | 'trip';
  list: number[];
  start: Endpoint | null;
  /** Where a trip ends; a year has no end flight. */
  end: Endpoint | null;
  name: string;
  tripId: string | null;
  year: number | null;
}

export type TourStep =
  | { kind: 'album'; index: number }
  | { kind: 'end'; end: Endpoint }
  | { kind: 'stop' };

export const nextInRange = (
  from: number,
  dir: 1 | -1,
  times: readonly number[],
  range: Range | null,
): number => {
  for (let i = from + dir; i >= 0 && i < times.length; i += dir) {
    const t = times[i];
    if (t !== undefined && within(t, range)) return i;
  }
  return -1;
};

/** What comes after the album in focus: the tour's next album, its end flight, or the range's. */
export const nextStep = (
  tour: Tour | null,
  focus: number,
  times: readonly number[],
  range: Range | null,
): TourStep => {
  if (tour) {
    const next = tour.list[tour.list.indexOf(focus) + 1];
    if (next !== undefined) return { kind: 'album', index: next };
    return tour.end ? { kind: 'end', end: tour.end } : { kind: 'stop' };
  }
  const index = nextInRange(focus, 1, times, range);
  return index < 0 ? { kind: 'stop' } : { kind: 'album', index };
};

/** The albums of a city, oldest first. */
export const cityAlbums = (archive: Archive, cityKey: string): number[] =>
  archive.albums.flatMap((album, index) => (album.city.key === cityKey ? [index] : []));

/** In a tour, only the tour's albums of this place (all of them if it has none). */
export const scopedAlbums = (indices: number[], tour: Tour | null): number[] => {
  if (!tour) return indices;
  const mine = indices.filter((index) => tour.list.includes(index));
  return mine.length > 0 ? mine : indices;
};

export const yearTour = (year: number, archive: Archive): Tour | null => {
  const list = archive.albums.flatMap((album, index) => (album.year === year ? [index] : []));
  return list.length === 0
    ? null
    : { kind: 'year', list, start: null, end: null, name: String(year), tripId: null, year };
};

export const tripTour = (trip: Trip, archive: Archive): Tour | null => {
  const list = trip.albumIds
    .map((id) => archive.albums.findIndex((album) => album.id === id))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  return list.length === 0
    ? null
    : {
        kind: 'trip',
        list,
        start: trip.start,
        end: trip.end,
        name: trip.name,
        tripId: trip.id,
        year: null,
      };
};
