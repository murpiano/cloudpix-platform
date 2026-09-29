import type { AppState, ArchivePage } from './app-state';
import { pausedFor } from './layers';
import type { Store } from './store';

type AppStore = Store<AppState>;

export type ArchiveSection = 'trips' | 'albums' | 'countries' | 'cities' | 'years';

export const SECTIONS: { key: ArchiveSection; label: string }[] = [
  { key: 'trips', label: 'Trips' },
  { key: 'albums', label: 'Albums' },
  { key: 'countries', label: 'Countries' },
  { key: 'cities', label: 'Cities' },
  { key: 'years', label: 'Years' },
];

export const sectionOf = (page: ArchivePage): ArchiveSection => {
  switch (page.kind) {
    case 'trips':
    case 'trip':
      return 'trips';
    case 'albums':
    case 'album':
      return 'albums';
    case 'countries':
    case 'country':
      return 'countries';
    case 'cities':
    case 'city':
      return 'cities';
    case 'years':
    case 'year':
      return 'years';
  }
};

/** Opens a page: on top of the walked ones, or `fresh` as the only one. */
export const openArchive = (store: AppStore, page: ArchivePage, fresh: boolean, slow = false) => {
  const current = store.get().archive;
  const stack = fresh || !current ? [page] : [...current.stack, page];
  store.set({ archive: { stack, slow }, menu: null });
  store.set({ paused: pausedFor(store.get()) });
};

/** One page back; from the first page, the archive closes. */
export const backArchive = (store: AppStore) => {
  const current = store.get().archive;
  if (!current) return;
  if (current.stack.length > 1) {
    store.set({ archive: { stack: current.stack.slice(0, -1), slow: false } });
    return;
  }
  closeArchive(store);
};

export const closeArchive = (store: AppStore) => {
  store.set({ archive: null });
  store.set({ paused: pausedFor(store.get()) });
};
