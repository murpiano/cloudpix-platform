import { byDate } from './order';
import type { Album, ArchiveData, City, Country, Id, Trip } from './types';

/** The archive as the UI reads it: linked both ways, with lookups. */
export interface Archive {
  data: ArchiveData;
  countries: Country[];
  /** Cities that hold at least one album: the lights on the globe. */
  cities: City[];
  /** Every album, oldest first. */
  albums: Album[];
  trips: Trip[];
  cityByKey: ReadonlyMap<Id, City>;
  albumById: ReadonlyMap<Id, Album>;
}

const build = (data: ArchiveData): Archive => {
  const countries = data.countries.map((countryData) => {
    const country: Country = { id: countryData.id, name: countryData.name, cities: [] };
    country.cities = countryData.cities.map((cityData) => {
      const { albums: albumData, ...place } = cityData;
      const city: City = { ...place, country, albums: [] };
      city.albums = albumData.map((album) => ({ ...album, city }));
      return city;
    });
    return country;
  });

  const allCities = countries.flatMap((country) => country.cities);
  const albums = allCities.flatMap((city) => city.albums).sort(byDate);

  return {
    data,
    countries,
    cities: allCities.filter((city) => city.albums.length > 0),
    albums,
    trips: data.trips,
    cityByKey: new Map(allCities.map((city) => [city.key, city])),
    albumById: new Map(albums.map((album) => [album.id, album])),
  };
};

export const linkArchive = (data: ArchiveData): Archive => build(data);

/**
 * Rebuilds the graph inside the archive that is already there. The director and the engine hold
 * this object and read it every frame, so an edit must not hand them a new one.
 */
export const relinkInto = (archive: Archive, data: ArchiveData): Archive =>
  Object.assign(archive, build(data));

export const photoTotal = (city: City): number =>
  city.albums.reduce((sum, album) => sum + album.photoCount, 0);

/** The years of visits, once each, oldest first. */
export const visitYears = (city: City): number[] =>
  [...new Set(city.albums.map((album) => album.year))].sort((a, b) => a - b);
