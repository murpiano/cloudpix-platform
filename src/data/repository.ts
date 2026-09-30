import type {
  AlbumData,
  ArchiveData,
  CityData,
  CountryData,
  Endpoint,
  Id,
  PhotoRef,
  Trip,
} from './types';

/** The single seam for storage. A backend swaps the implementation, not the app. */
export interface Repository {
  /** Can the owner change what is in it? */
  readonly editable: boolean;
  load(): Promise<ArchiveData>;
  /** Keeps the graph. Throws (or rejects) when it could not be kept: the caller tells the owner. */
  save(data: ArchiveData): void | Promise<void>;
  addPhoto(blob: Blob, name: string): Promise<PhotoRef>;
  dropPhotos(refs: PhotoRef[]): Promise<void>;
  /** The file of one of the owner's photos, for a backup; null when it is gone. */
  readPhoto(id: Id): Promise<Blob | null>;
  /** Puts a backup in place of everything that is kept. */
  restore(data: ArchiveData, photos: ReadonlyMap<Id, Blob>): Promise<void>;
  /** Throws everything away: the archive starts again from the demo. */
  clear(): Promise<void>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): value is string => typeof value === 'string';
const num = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const cleanPhoto = (raw: unknown): PhotoRef | null => {
  if (!isObject(raw)) return null;
  const caption = str(raw.caption) ? { caption: raw.caption } : {};
  if (raw.kind === 'stock' && str(raw.file)) return { kind: 'stock', file: raw.file, ...caption };
  if (raw.kind === 'own' && str(raw.id) && str(raw.name)) {
    return { kind: 'own', id: raw.id, name: raw.name, ...caption };
  }
  return null;
};

const inRange = (value: unknown, lo: number, hi: number): value is number =>
  num(value) && value >= lo && value <= hi;

const cleanAlbum = (raw: unknown): AlbumData | null => {
  if (!isObject(raw)) return null;
  if (!str(raw.id) || !str(raw.title) || !/^\d{1,2}:\d{2}$/.test(String(raw.time))) return null;
  // a month or a day outside the calendar renders as "undefined" and breaks every sort by date
  if (!num(raw.year) || !inRange(raw.month, 1, 12) || !inRange(raw.day, 1, 31)) return null;
  const photos = Array.isArray(raw.photos)
    ? raw.photos.map(cleanPhoto).filter((photo): photo is PhotoRef => photo !== null)
    : [];
  const claimed = num(raw.photoCount) ? Math.round(raw.photoCount) : 0;
  return {
    id: raw.id,
    title: raw.title,
    year: Math.round(raw.year),
    month: Math.round(raw.month),
    day: Math.round(raw.day),
    time: String(raw.time),
    photoCount: Math.max(photos.length, claimed),
    photos,
  };
};

const cleanCity = (raw: unknown): CityData | null => {
  if (!isObject(raw)) return null;
  if (!str(raw.key) || !str(raw.name) || !num(raw.lat) || !num(raw.lon)) return null;
  const albums = Array.isArray(raw.albums)
    ? raw.albums.map(cleanAlbum).filter((album): album is AlbumData => album !== null)
    : [];
  return { key: raw.key, name: raw.name, lat: raw.lat, lon: raw.lon, albums };
};

const cleanCountry = (raw: unknown): CountryData | null => {
  if (!isObject(raw) || !str(raw.id) || !str(raw.name)) return null;
  const cities = Array.isArray(raw.cities)
    ? raw.cities.map(cleanCity).filter((city): city is CityData => city !== null)
    : [];
  return { id: raw.id, name: raw.name, cities };
};

const cleanEnd = (raw: unknown): Endpoint | null => {
  if (!isObject(raw)) return null;
  if (raw.home === true) return { home: true };
  return str(raw.cityKey) ? { cityKey: raw.cityKey } : null;
};

const cleanTrip = (raw: unknown): Trip | null => {
  if (!isObject(raw) || !str(raw.id) || !str(raw.name)) return null;
  const start = cleanEnd(raw.start);
  const end = cleanEnd(raw.end);
  if (!start || !end) return null;
  const albumIds = Array.isArray(raw.albumIds) ? [...new Set(raw.albumIds.filter(str))] : [];
  return { id: raw.id, name: raw.name, start, end, albumIds };
};

/** The first of each, by whatever tells them apart: a repeated id or key confuses every lookup. */
const once = <T>(items: T[], keyOf: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Kept JSON, maybe from an older build or an editing hand, made safe to use. */
export const cleanArchive = (raw: unknown): ArchiveData | null => {
  if (!isObject(raw) || !Array.isArray(raw.countries)) return null;
  const countries = once(
    raw.countries.map(cleanCountry).filter((country): country is CountryData => country !== null),
    (country) => country.id,
  );
  const cityKeys = new Set<string>();
  const albumIds = new Set<string>();
  for (const country of countries) {
    country.cities = country.cities.filter((city) => {
      if (cityKeys.has(city.key)) return false;
      cityKeys.add(city.key);
      city.albums = city.albums.filter((album) => {
        if (albumIds.has(album.id)) return false;
        albumIds.add(album.id);
        return true;
      });
      return true;
    });
  }
  const trips = Array.isArray(raw.trips)
    ? once(
        raw.trips.map(cleanTrip).filter((trip): trip is Trip => trip !== null),
        (trip) => trip.id,
      )
    : [];
  return { countries, trips };
};
