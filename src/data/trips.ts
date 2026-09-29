import type { Archive } from './archive';
import type { Endpoint, Place, Trip } from './types';

export const tripOfAlbum = (archive: Archive, albumId: string): Trip | undefined =>
  archive.trips.find((trip) => trip.albumIds.includes(albumId));

export interface EndpointPlace {
  name: string;
  country: string;
  lon: number;
  lat: number;
  /** null for home. */
  cityKey: string | null;
}

/** Where a trip starts or ends: home, or a city on the map (home again if the city is gone). */
export const endpointPlace = (end: Endpoint, archive: Archive, home: Place): EndpointPlace => {
  if ('cityKey' in end) {
    const city = archive.cityByKey.get(end.cityKey);
    if (city) {
      return { name: city.name, country: city.country.name, lon: city.lon, lat: city.lat, cityKey: city.key };
    }
  }
  return { name: home.name, country: home.country, lon: home.lon, lat: home.lat, cityKey: null };
};
