import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from './app-state';
import type { AppState } from './app-state';
import { backArchive, closeArchive, openArchive, sectionOf } from './archive-nav';
import { createStore } from './store';

const setup = () => createStore<AppState>({ ...INITIAL_STATE });

describe('the archive stack', () => {
  it('opens on a page, pauses the world and closes the menus', () => {
    const store = setup();
    store.set({ menu: 'nav' });
    openArchive(store, { kind: 'trips' }, true);
    expect(store.get().archive).toEqual({ stack: [{ kind: 'trips' }], slow: false });
    expect(store.get().paused).toBe(true);
    expect(store.get().menu).toBeNull();
  });

  it('walks deeper and back one page at a time, then closes', () => {
    const store = setup();
    openArchive(store, { kind: 'cities' }, true);
    openArchive(store, { kind: 'city', key: 'paris' }, false);
    expect(store.get().archive?.stack).toHaveLength(2);
    backArchive(store);
    expect(store.get().archive?.stack).toEqual([{ kind: 'cities' }]);
    backArchive(store);
    expect(store.get().archive).toBeNull();
    expect(store.get().paused).toBe(false);
  });

  it('starts over with a fresh page', () => {
    const store = setup();
    openArchive(store, { kind: 'cities' }, true);
    openArchive(store, { kind: 'city', key: 'paris' }, false);
    openArchive(store, { kind: 'years' }, true);
    expect(store.get().archive?.stack).toEqual([{ kind: 'years' }]);
  });

  it('can fade back in slowly', () => {
    const store = setup();
    openArchive(store, { kind: 'year', year: 2023 }, true, true);
    expect(store.get().archive?.slow).toBe(true);
    closeArchive(store);
    expect(store.get().archive).toBeNull();
  });

  it('knows the section of every page', () => {
    expect(sectionOf({ kind: 'trip', id: 'x' })).toBe('trips');
    expect(sectionOf({ kind: 'album', id: 'x' })).toBe('albums');
    expect(sectionOf({ kind: 'country', id: '250' })).toBe('countries');
    expect(sectionOf({ kind: 'city', key: 'paris' })).toBe('cities');
    expect(sectionOf({ kind: 'year', year: 2020 })).toBe('years');
  });
});
