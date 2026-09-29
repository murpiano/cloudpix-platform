import type { Archive } from '@/data/archive';
import type { Endpoint, Place } from '@/data/types';

/** Where a trip starts and ends: home, or any city already on the map. */
export const endpointOptions = (
  archive: Archive,
  home: Place,
): { value: string; label: string }[] => [
  { value: 'home', label: `Home · ${home.name}` },
  ...archive.cities
    .map((city) => ({ value: city.key, label: `${city.name}, ${city.country.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label)),
];

export const endpointOf = (value: string): Endpoint =>
  value === 'home' ? { home: true } : { cityKey: value };

export const endpointValue = (end: Endpoint): string => ('home' in end ? 'home' : end.cityKey);
