import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store';

describe('createStore', () => {
  it('returns the initial state', () => {
    const store = createStore({ count: 1, name: 'a' });
    expect(store.get()).toEqual({ count: 1, name: 'a' });
  });

  it('merges a patch and tells the listeners', () => {
    const store = createStore({ count: 1, name: 'a' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ count: 2 });
    expect(store.get()).toEqual({ count: 2, name: 'a' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the same state object and stays quiet when nothing changes', () => {
    const store = createStore({ count: 1 });
    const before = store.get();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ count: 1 });
    expect(store.get()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops telling a listener after it unsubscribes', () => {
    const store = createStore({ count: 1 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set({ count: 2 });
    expect(listener).not.toHaveBeenCalled();
  });
});
