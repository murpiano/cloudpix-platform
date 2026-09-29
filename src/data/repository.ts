import type {
  AlbumData,
  ArchiveData,
  CityData,
  CountryData,
  Endpoint,
  PhotoRef,
  Trip,
} from './types';

/** The single seam for storage. A backend swaps the implementation, not the app. */
export interface Repository {
  /** Can the owner change what is in it? */
  readonly editable: boolean;
  load(): Promise<ArchiveData>;
  save(data: ArchiveData): void;
  addPhoto(blob: Blob, name: string): Promise<PhotoRef>;
  dropPhotos(refs: PhotoRef[]): Promise<void>;
  /** Throws everything away: the archive starts again from the demo. */
  clear(): Promise<void>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): value is string => typeof value === 'string';
const num = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const cleanPhoto = (raw: unknown): PhotoRef | null => {
  if (!isObject(raw)) return null;
  const caption = str(raw.caption) ? { caption: raw.caption } : {};
  if (raw.kind === 'stock' && str(raw.file)) return { kind: 'stock', file: raw.file, ...caption };
  if (raw.kind === 'own' && str(raw.id) && str(raw.name)) {
    return { kind: 'own', id: raw.id, name: raw.name, ...caption };
  }
  return null;
};

const cleanAlbum = (raw: unknown): AlbumData | null => {
  if (!isObject(raw)) return null;
  if (!str(raw.id) || !str(raw.title) || !str(raw.time)) return null;
  if (!num(raw.year) || !num(raw.month) || !num(raw.day)) return null;
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
    time: raw.time,
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
  const albumIds = Array.isArray(raw.albumIds) ? raw.albumIds.filter(str) : [];
  return { id: raw.id, name: raw.name, start, end, albumIds };
};

/** Kept JSON, maybe from an older build or an editing hand, made safe to use. */
export const cleanArchive = (raw: unknown): ArchiveData | null => {
  if (!isObject(raw) || !Array.isArray(raw.countries)) return null;
  const countries = raw.countries
    .map(cleanCountry)
    .filter((country): country is CountryData => country !== null);
  const trips = Array.isArray(raw.trips)
    ? raw.trips.map(cleanTrip).filter((trip): trip is Trip => trip !== null)
    : [];
  return { countries, trips };
};
