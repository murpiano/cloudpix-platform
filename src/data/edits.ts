import { slugOf } from './order';
import type { PickedPlace } from './places';
import { photoKey } from './social';
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

/** An id nothing else will take: the time in base 36 plus a little noise. */
export const freshId = (prefix: string, now = Date.now(), random: () => number = Math.random): Id =>
  `${prefix}${now.toString(36)}${Math.floor(random() * 1e6).toString(36)}`;

const countryFor = (data: ArchiveData, id: Id, name: string): CountryData => {
  const found = data.countries.find((country) => country.id === id || country.name === name);
  if (found) return found;
  const country: CountryData = { id, name, cities: [] };
  data.countries.push(country);
  return country;
};

const allCities = (data: ArchiveData): CityData[] =>
  data.countries.flatMap((country) => country.cities);

/** The city a picked place points at, made if it is new. A new place becomes a new light. */
export const cityFor = (data: ArchiveData, place: PickedPlace): CityData => {
  const country = countryFor(data, place.countryId, place.country);
  if (place.cityKey !== undefined) {
    const known = country.cities.find((city) => city.key === place.cityKey);
    if (known) return known;
  }
  // the same name at the same spot is the same city; a namesake far away is another one
  const mine = country.cities.find(
    (city) =>
      city.name === place.name &&
      Math.abs(city.lat - place.lat) < 1 &&
      Math.abs(city.lon - place.lon) < 1,
  );
  if (mine) return mine;
  // the key is the slug; one that is taken (or that a non-Latin name leaves empty) gets more added
  const taken = new Set(allCities(data).map((city) => city.key));
  const countrySlug = slugOf(place.country);
  const candidates = [slugOf(place.name), `${slugOf(place.name)}-${countrySlug}`].filter(Boolean);
  let key = candidates.find((candidate) => !taken.has(candidate));
  for (let n = 2; key === undefined; n++) {
    const more = `${candidates[candidates.length - 1] ?? (countrySlug || 'place')}-${n}`;
    if (!taken.has(more)) key = more;
  }
  const city: CityData = { key, name: place.name, lat: place.lat, lon: place.lon, albums: [] };
  country.cities.push(city);
  return city;
};

/**
 * A city with no albums stays only while a trip starts or ends there (the plane flies to it, no
 * light is drawn); a country with no cities goes with them.
 */
const pruneEmpty = (data: ArchiveData): void => {
  const wanted = new Set<string>();
  for (const trip of data.trips) {
    if ('cityKey' in trip.start) wanted.add(trip.start.cityKey);
    if ('cityKey' in trip.end) wanted.add(trip.end.cityKey);
  }
  for (const country of data.countries) {
    country.cities = country.cities.filter(
      (city) => city.albums.length > 0 || wanted.has(city.key),
    );
  }
  data.countries = data.countries.filter((country) => country.cities.length > 0);
};

const findAlbum = (data: ArchiveData, albumId: Id): { city: CityData; album: AlbumData } | null => {
  for (const city of allCities(data)) {
    const album = city.albums.find((one) => one.id === albumId);
    if (album) return { city, album };
  }
  return null;
};

const detach = (data: ArchiveData, albumId: Id) => {
  for (const trip of data.trips) {
    trip.albumIds = trip.albumIds.filter((id) => id !== albumId);
  }
};

const attach = (data: ArchiveData, albumId: Id, tripId: Id | null) => {
  detach(data, albumId);
  if (tripId === null) return;
  const trip = data.trips.find((one) => one.id === tripId);
  if (trip) trip.albumIds.push(albumId);
};

export interface AlbumFields {
  title: string;
  year: number;
  month: number;
  day: number;
  time: string;
  place: PickedPlace;
  tripId: Id | null;
}

export const addAlbum = (data: ArchiveData, id: Id, fields: AlbumFields): AlbumData => {
  const city = cityFor(data, fields.place);
  const album: AlbumData = {
    id,
    title: fields.title,
    year: fields.year,
    month: fields.month,
    day: fields.day,
    time: fields.time,
    photoCount: 0,
    photos: [],
  };
  city.albums.push(album);
  attach(data, id, fields.tripId);
  return album;
};

export const updateAlbum = (data: ArchiveData, albumId: Id, fields: AlbumFields): void => {
  const found = findAlbum(data, albumId);
  if (!found) return;
  const { city, album } = found;
  album.title = fields.title;
  album.year = fields.year;
  album.month = fields.month;
  album.day = fields.day;
  album.time = fields.time;
  const next = cityFor(data, fields.place);
  if (next !== city) {
    city.albums.splice(city.albums.indexOf(album), 1);
    next.albums.push(album);
  }
  attach(data, albumId, fields.tripId);
  pruneEmpty(data);
};

/** Deletes the album and hands back the photos, so the caller can drop their blobs. */
export const deleteAlbum = (data: ArchiveData, albumId: Id): PhotoRef[] => {
  const found = findAlbum(data, albumId);
  if (!found) return [];
  found.city.albums.splice(found.city.albums.indexOf(found.album), 1);
  detach(data, albumId);
  pruneEmpty(data);
  return found.album.photos;
};

export const addPhotos = (data: ArchiveData, albumId: Id, refs: PhotoRef[]): void => {
  const found = findAlbum(data, albumId);
  if (!found) return;
  found.album.photos.push(...refs);
  found.album.photoCount += refs.length;
};

/** Takes a photo out; a demo album that claims more photos than it carries keeps its claim. */
export const removePhoto = (data: ArchiveData, albumId: Id, key: string): PhotoRef | null => {
  const found = findAlbum(data, albumId);
  if (!found) return null;
  const index = found.album.photos.findIndex((photo) => photoKey(photo) === key);
  if (index < 0) return null;
  const [gone] = found.album.photos.splice(index, 1);
  found.album.photoCount = Math.max(found.album.photos.length, found.album.photoCount - 1);
  return gone ?? null;
};

export const setCaption = (data: ArchiveData, albumId: Id, key: string, text: string): void => {
  const found = findAlbum(data, albumId);
  const photo = found?.album.photos.find((one) => photoKey(one) === key);
  if (!photo) return;
  const caption = text.trim();
  if (caption) photo.caption = caption;
  else delete photo.caption;
};

export interface TripFields {
  name: string;
  start: Endpoint;
  end: Endpoint;
  albumIds: Id[];
}

export const addTrip = (data: ArchiveData, id: Id, fields: TripFields): Trip => {
  const trip: Trip = { id, name: fields.name, start: fields.start, end: fields.end, albumIds: [] };
  data.trips.push(trip);
  for (const albumId of fields.albumIds) attach(data, albumId, id);
  return trip;
};

export const updateTrip = (data: ArchiveData, tripId: Id, fields: TripFields): void => {
  const trip = data.trips.find((one) => one.id === tripId);
  if (!trip) return;
  trip.name = fields.name;
  trip.start = fields.start;
  trip.end = fields.end;
  trip.albumIds = [];
  for (const albumId of fields.albumIds) attach(data, albumId, tripId);
  pruneEmpty(data);
};

/** The trip goes; its albums stay where they are. */
export const deleteTrip = (data: ArchiveData, tripId: Id): void => {
  const index = data.trips.findIndex((trip) => trip.id === tripId);
  if (index >= 0) data.trips.splice(index, 1);
  pruneEmpty(data);
};
