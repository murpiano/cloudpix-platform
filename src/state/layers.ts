import type { AppState, FormView, Rect } from './app-state';
import type { Store } from './store';

type AppStore = Store<AppState>;

/** The world clock stops while a form, the photo window or the archive is open. */
export const pausedFor = (state: AppState): boolean =>
  state.form !== null || state.photo !== null || state.archive !== null;

export const openPhoto = (store: AppStore, albumId: string, index: number, from: Rect | null) => {
  store.set({
    photo: { albumId, index, previous: null, dir: 0, from, slideshow: false, closing: false },
    menu: null,
  });
  store.set({ paused: pausedFor(store.get()) });
};

/** The next (by > 0) or previous photo of the album, in a loop. */
export const stepPhoto = (store: AppStore, count: number, by: number) => {
  const photo = store.get().photo;
  if (!photo || photo.closing || count < 2 || by === 0) return;
  const index = (((photo.index + by) % count) + count) % count;
  store.set({ photo: { ...photo, index, previous: photo.index, dir: by > 0 ? 1 : -1 } });
};

export const toggleSlideshow = (store: AppStore) => {
  const photo = store.get().photo;
  if (!photo || photo.closing) return;
  store.set({ photo: { ...photo, slideshow: !photo.slideshow } });
};

/** Starts the flight back into the tile; `finishPhoto` ends it. */
export const closePhoto = (store: AppStore) => {
  const photo = store.get().photo;
  if (!photo || photo.closing) return;
  store.set({ photo: { ...photo, closing: true, slideshow: false } });
};

export const finishPhoto = (store: AppStore) => {
  store.set({ photo: null });
  store.set({ paused: pausedFor(store.get()) });
};

export const toggleMenu = (store: AppStore, menu: 'nav' | 'settings') => {
  store.set({ menu: store.get().menu === menu ? null : menu });
};

export const openForm = (store: AppStore, form: FormView) => {
  store.set({ form, menu: null });
  store.set({ paused: pausedFor(store.get()) });
};

export const closeForm = (store: AppStore) => {
  store.set({ form: null });
  store.set({ paused: pausedFor(store.get()) });
};

/** What Esc closes, innermost first: form, menu, photo, archive (one step), the journey. */
export type EscapeTarget = 'form' | 'menu' | 'photo' | 'archive' | 'journey';

export const escapeTarget = (state: AppState): EscapeTarget =>
  state.form
    ? 'form'
    : state.menu
      ? 'menu'
      : state.photo
        ? 'photo'
        : state.archive
          ? 'archive'
          : 'journey';
