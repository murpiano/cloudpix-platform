import type { Archive } from '@/data/archive';
import { cityFor } from '@/data/edits';
import type { PickedPlace } from '@/data/places';
import type { ArchiveData, Endpoint } from '@/data/types';

/** Where a trip starts or ends in the form: home, or any city of the world. */
export type EndChoice = 'home' | PickedPlace;

/** The choice a trip already has: its own city, or home. */
export const endChoiceOf = (end: Endpoint, archive: Archive): EndChoice => {
  if ('cityKey' in end) {
    const city = archive.cityByKey.get(end.cityKey);
    if (city) {
      return {
        name: city.name,
        country: city.country.name,
        countryId: city.country.id,
        lat: city.lat,
        lon: city.lon,
        cityKey: city.key,
      };
    }
  }
  return 'home';
};

/**
 * The endpoint to store. A city that is not in the archive yet is made in it, with no albums: it
 * gets no light of its own, but the plane can fly there.
 */
export const endpointFor = (data: ArchiveData, choice: EndChoice): Endpoint =>
  choice === 'home' ? { home: true } : { cityKey: cityFor(data, choice).key };
