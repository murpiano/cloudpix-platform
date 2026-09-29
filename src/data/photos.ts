import { demoUrl } from '@/lib/assets';
import { ownUrl } from './blobs';
import type { City, Credit, PhotoRef } from './types';

/** A stock photo comes from the bundle; the owner's comes from the blob registered on load. */
export const photoUrl = (photo: PhotoRef): string | null =>
  photo.kind === 'stock' ? demoUrl(`photos/${photo.file}`) : ownUrl(photo.id);

export const creditLine = (
  photo: PhotoRef,
  city: City,
  credits: ReadonlyMap<string, Credit>,
): string => {
  if (photo.kind === 'own') return `${city.name} · your photo`;
  const credit = credits.get(photo.file);
  return `${city.name} · photo: ${credit?.author ?? 'unknown'} · ${credit?.lic ?? ''} · Wikimedia Commons`;
};

/** Every photo of a city, once each, in album order. */
export const cityPhotos = (city: City): PhotoRef[] => {
  const seen = new Set<string>();
  const photos: PhotoRef[] = [];
  for (const album of city.albums) {
    for (const photo of album.photos) {
      const key = photo.kind === 'stock' ? photo.file : photo.id;
      if (seen.has(key)) continue;
      seen.add(key);
      photos.push(photo);
    }
  }
  return photos;
};
