import { createStore } from './store';

export interface AppState {
  /**
   * The city the hover label shows. It keeps the last city after the cursor leaves, so the label
   * can fade out with its text still in it.
   */
  labelCityKey: string | null;
  /** True while the photo window or the archive is open: the world clock stops. */
  paused: boolean;
}

export const appStore = createStore<AppState>({ labelCityKey: null, paused: false });
