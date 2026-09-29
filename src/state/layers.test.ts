import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from './app-state';
import type { AppState } from './app-state';
import {
  closePhoto,
  escapeTarget,
  finishPhoto,
  openPhoto,
  stepPhoto,
  toggleMenu,
  toggleSlideshow,
} from './layers';
import { createStore } from './store';

const setup = () => createStore<AppState>({ ...INITIAL_STATE });
const FROM = { x: 10, y: 20, width: 300, height: 200 };

describe('the photo window', () => {
  it('opens over everything, closes the menus and pauses the world', () => {
    const store = setup();
    toggleMenu(store, 'nav');
    openPhoto(store, 'paris/x', 1, FROM);
    expect(store.get().photo).toEqual({
      albumId: 'paris/x',
      index: 1,
      previous: null,
      dir: 0,
      from: FROM,
      slideshow: false,
      closing: false,
    });
    expect(store.get().menu).toBeNull();
    expect(store.get().paused).toBe(true);
  });

  it('steps through the album in a loop and remembers where it came from', () => {
    const store = setup();
    openPhoto(store, 'a', 0, null);
    stepPhoto(store, 3, -1);
    expect(store.get().photo).toMatchObject({ index: 2, previous: 0, dir: -1 });
    stepPhoto(store, 3, 2);
    expect(store.get().photo).toMatchObject({ index: 1, previous: 2, dir: 1 });
  });

  it('does not step an album of one', () => {
    const store = setup();
    openPhoto(store, 'a', 0, null);
    stepPhoto(store, 1, 1);
    expect(store.get().photo).toMatchObject({ index: 0, previous: null });
  });

  it('toggles the slideshow', () => {
    const store = setup();
    openPhoto(store, 'a', 0, null);
    toggleSlideshow(store);
    expect(store.get().photo?.slideshow).toBe(true);
    toggleSlideshow(store);
    expect(store.get().photo?.slideshow).toBe(false);
  });

  it('flies back before it goes, and the world resumes once it is gone', () => {
    const store = setup();
    openPhoto(store, 'a', 0, null);
    toggleSlideshow(store);
    closePhoto(store);
    expect(store.get().photo).toMatchObject({ closing: true, slideshow: false });
    expect(store.get().paused).toBe(true);
    finishPhoto(store);
    expect(store.get().photo).toBeNull();
    expect(store.get().paused).toBe(false);
  });
});

describe('the photo window over the archive', () => {
  it('keeps the world paused when it closes over the archive', () => {
    const store = setup();
    store.set({ archive: { stack: [{ kind: 'trips' }], slow: false } });
    openPhoto(store, 'a', 0, null);
    closePhoto(store);
    finishPhoto(store);
    expect(store.get().paused).toBe(true);
  });
});

describe('menus', () => {
  it('opens one menu at a time', () => {
    const store = setup();
    toggleMenu(store, 'nav');
    toggleMenu(store, 'settings');
    expect(store.get().menu).toBe('settings');
    toggleMenu(store, 'settings');
    expect(store.get().menu).toBeNull();
  });
});

describe('escapeTarget', () => {
  it('closes the innermost layer first', () => {
    const store = setup();
    expect(escapeTarget(store.get())).toBe('journey');
    store.set({ archive: { stack: [{ kind: 'trips' }], slow: false } });
    expect(escapeTarget(store.get())).toBe('archive');
    openPhoto(store, 'a', 0, null);
    expect(escapeTarget(store.get())).toBe('photo');
    store.set({ menu: 'settings' });
    expect(escapeTarget(store.get())).toBe('menu');
  });
});
