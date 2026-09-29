import type { ArchivePage } from '@/state/app-state';
import { appStore } from '@/state/app-state';
import { closeArchive, openArchive } from '@/state/archive-nav';
import { finishPhoto } from '@/state/layers';
import type { Director } from '@/tour/director';

/** The pages a tour was started from, to come back to when it ends by itself. */
let returnTo: ArchivePage[] | null = null;

export const takeReturn = (): ArchivePage[] | null => {
  const pages = returnTo;
  returnTo = null;
  return pages;
};

export const forgetReturn = () => {
  returnTo = null;
};

/** The one way into the archive from the main screen and the photo window. */
export const goArchive = (page: ArchivePage) => {
  if (appStore.get().photo) finishPhoto(appStore);
  openArchive(appStore, page, true);
};

export type MapTarget =
  | { kind: 'album'; id: string }
  | { kind: 'year'; year: number }
  | { kind: 'trip'; id: string };

/** "Show on map": the archive closes and the globe shows the album, the year or the trip. */
export const showOnMap = (director: Director, target: MapTarget) => {
  const pages = appStore.get().archive?.stack ?? null;
  closeArchive(appStore);
  const shown =
    target.kind === 'album'
      ? director.showAlbumOnMap(target.id)
      : target.kind === 'year'
        ? director.showYear(target.year)
        : director.showTrip(target.id);
  // only a year or a trip plays a tour that can end by itself
  returnTo = shown && target.kind !== 'album' ? pages : null;
};
