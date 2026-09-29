import type { Range } from '@/timeline/range';
import type { Tour } from '@/tour/tour';
import { createStore } from './store';

/** The panel's card when a trip has ended: home, or the city it ended in. */
export interface EndCard {
  home: boolean;
  cityKey: string | null;
  /** The last album before the end flight. */
  fromAlbumId: string;
  tour: Tour | null;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The photo window: which photo of which album, and how it got there. */
export interface PhotoView {
  albumId: string;
  index: number;
  /** The photo it came from, sliding away under the new one. */
  previous: number | null;
  /** The side the photo came from: 1 next, -1 previous, 0 opened. */
  dir: -1 | 0 | 1;
  /** Where it was clicked, to grow out of it. */
  from: Rect | null;
  slideshow: boolean;
  /** Flying back into its tile; the window goes when the flight ends. */
  closing: boolean;
}

/** A page of the archive. */
export type ArchivePage =
  | { kind: 'trips' }
  | { kind: 'trip'; id: string }
  | { kind: 'albums' }
  | { kind: 'album'; id: string }
  | { kind: 'countries' }
  | { kind: 'country'; id: string }
  | { kind: 'cities' }
  | { kind: 'city'; key: string }
  | { kind: 'years' }
  | { kind: 'year'; year: number };

/** A modal sheet over everything: logging in, the account, a trip, an album, a photo. */
export type FormView =
  | { kind: 'login'; why: string | null }
  | { kind: 'account' }
  | { kind: 'about' }
  | { kind: 'trip'; id: string | null; albumIds: string[] }
  | { kind: 'album'; id: string | null; cityKey: string | null; tripId: string | null }
  | { kind: 'photo'; albumId: string; photoKey: string };

/** The archive over the globe: the pages walked, the last one shown. */
export interface ArchiveView {
  stack: ArchivePage[];
  /** Fading back in slowly after a tour. */
  slow: boolean;
}

export interface AppState {
  /**
   * The city the hover label shows. It keeps the last city after the cursor leaves, so the label
   * can fade out with its text still in it.
   */
  labelCityKey: string | null;
  /** True while the photo window or the archive is open: the world clock stops. */
  paused: boolean;
  /** Album index (into archive.albums) in focus, -1 for none. */
  focus: number;
  /** The plane has landed at home after a trip. */
  atHome: boolean;
  /** On a phone: the album cards sit at the bottom, because the plane is flying at the top. */
  albumsLow: boolean;
  /** A flight (or a camera turn) is under way. */
  flying: boolean;
  /** Length of the flight under way, for the caption. */
  flightKm: number | null;
  endCard: EndCard | null;
  range: Range | null;
  /** The range being dragged out on the timeline, before it is let go. */
  picking: Range | null;
  /** Yellow progress on; off after a new pick until the plane moves again. */
  progress: boolean;
  playing: boolean;
  tour: Tour | null;
  /** The tour that just ended, still shown above the end card. */
  lastTour: Tour | null;
  /** The photo window, open over everything. */
  photo: PhotoView | null;
  /** The burger menu or the settings, open under the header. */
  menu: 'nav' | 'settings' | null;
  /** The archive, open over the globe. */
  archive: ArchiveView | null;
  /** The form sheet, open over everything. */
  form: FormView | null;
  /** Counts the year and trip tours that ended by themselves. */
  tourDone: number;
}

export const INITIAL_STATE: AppState = {
  labelCityKey: null,
  paused: false,
  focus: -1,
  atHome: false,
  albumsLow: false,
  flying: false,
  flightKm: null,
  endCard: null,
  range: null,
  picking: null,
  progress: true,
  playing: false,
  tour: null,
  lastTour: null,
  photo: null,
  menu: null,
  archive: null,
  form: null,
  tourDone: 0,
};

export const appStore = createStore<AppState>({ ...INITIAL_STATE });
