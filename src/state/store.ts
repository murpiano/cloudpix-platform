import { useSyncExternalStore } from 'react';

export interface Store<T extends object> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(listener: () => void): () => void;
}

/**
 * A tiny store. React reads it through `useStore`; the canvas engine reads `get()` every frame
 * and calls `set` only when something changes, so React never renders once per frame.
 */
export const createStore = <T extends object>(initial: T): Store<T> => {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(patch) {
      const keys = Object.keys(patch) as (keyof T)[];
      if (!keys.some((key) => !Object.is(patch[key], state[key]))) {
        return;
      }
      state = { ...state, ...patch };
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/** Reads a slice of a store. `select` must return a primitive or an object kept in the state. */
export const useStore = <T extends object, S>(store: Store<T>, select: (state: T) => S): S =>
  useSyncExternalStore(store.subscribe, () => select(store.get()));
