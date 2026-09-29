import { geoDistance } from 'd3-geo';
import type { Archive } from '@/data/archive';
import { endpointPlace } from '@/data/trips';
import type { City, Endpoint, Place } from '@/data/types';
import { euler, slerp } from '@/geo/camera';
import type { Rotation } from '@/geo/camera';
import type { LonLat } from '@/geo/vector';
import { clamp } from '@/lib/math';
import type { PlaceFacts } from '@/render/places';
import type { AppState } from '@/state/app-state';
import type { Store } from '@/state/store';
import { albumTime, isReached, pickedRange, span, within, yearRange } from '@/timeline/range';
import { createFlight, planeAlpha, riseZoom, stepFlight } from './flight';
import type { Flight } from './flight';
import { cityAlbums, nextInRange, nextStep, scopedAlbums, tripTour, yearTour } from './tour';

export interface Pace {
  photoMs: number;
  flightMs: number;
}

export interface DirectorOptions {
  archive: Archive;
  home: Place;
  store: Store<AppState>;
  pace: () => Pace;
}

/** What the director asks of the camera this frame. */
export interface Drive {
  /** The camera's rotation, when the director steers it. */
  rot: Rotation | null;
  /** The zoom with the mid-flight rise. */
  zoom: number;
  steering: boolean;
}

export interface LegView {
  path: (k: number) => LonLat;
  upto: number;
  alpha: number;
}

export interface PlaneView {
  at: LonLat;
  behind: LonLat;
  ahead: LonLat;
  alpha: number;
}

/** Everything the engine draws from the journey. */
export interface DirectorView {
  focusCityKey: string | null;
  reached: ReadonlySet<string>;
  inLive: ReadonlySet<string>;
  rangeActive: boolean;
  /** 0 or 1: someone is home. */
  homeLit: number;
  homePulseAt: number;
  pulseAt: ReadonlyMap<string, number>;
  /** Faint great circles between the places already reached. */
  route: [LonLat, LonLat][];
  leg: LegView | null;
  plane: PlaneView | null;
  now: number;
}

/** After a landing, a playing tour rests on the place at least this long. */
export const DWELL_MIN_MS = 3500;
/** The last leg fades to a trace over this time. */
const LEG_FADE_MS = 3000;

export const placeFacts = (view: DirectorView, cityKey: string): PlaceFacts => ({
  focused: view.focusCityKey === cityKey,
  reached: view.reached.has(cityKey),
  inRange: view.inLive.has(cityKey),
  rangeActive: view.rangeActive,
});

interface Leg {
  flight: Flight;
  /** The city of the album in focus; null for a trip's end flight. */
  city: City | null;
  end: Endpoint | null;
  fromHome: boolean;
}

/**
 * The journey on the globe: which album is in focus, the flight to it, tours, the timeline range.
 * Pure: the engine calls `step` every frame with the world time and draws `view()`; React reads
 * the store and calls the other methods.
 */
export const createDirector = ({ archive, home, store, pace }: DirectorOptions) => {
  const albums = archive.albums;
  // `relinkInto` refills these lists in place, so an edit changes what is in them
  let times = albums.map(albumTime);
  let [firstYear] = span(times);
  const homeAt: LonLat = [home.lon, home.lat];
  const at = (city: City): LonLat => [city.lon, city.lat];
  const timeOf = (index: number) => times[index] ?? 0;
  const get = store.get;
  const set = store.set;

  let now = 0;
  let rot: Rotation = [0, 0, 0];
  let leg: Leg | null = null;
  let lastLeg: { path: (k: number) => LonLat; end: number } | null = null;
  /** Where the next flight starts when it is not the place in focus: a trip's start or end. */
  let origin: LonLat | null = null;
  let snap: Rotation | null = null;
  let dwell = 0;
  let pickFrom: number | null = null;
  const pulseAt = new Map<string, number>();
  let homePulseAt = -Infinity;

  const dwellMs = () => Math.max(DWELL_MIN_MS, pace().photoMs);

  const stop = () => {
    dwell = 0;
    set({ playing: false });
  };

  const leaveTour = () => {
    if (!get().tour) return;
    set({ tour: null });
    stop();
  };

  /** Another album of the place already in focus: no flight. */
  const showAlbum = (index: number) => set({ focus: index });

  const flyTo = (index: number) => {
    const album = albums[index];
    if (!album) return;
    const { focus, endCard } = get();
    const here = leg ? leg.city : endCard ? null : (albums[focus]?.city ?? null);
    if (here === album.city) {
      showAlbum(index);
      return;
    }
    const focusCity = albums[focus]?.city;
    const from: LonLat | null = leg
      ? leg.flight.path
        ? leg.flight.path(leg.flight.e)
        : null
      : (origin ?? (focusCity ? at(focusCity) : homeAt));
    const fromHome = leg === null && from !== null && geoDistance(from, homeAt) < 1e-4;
    origin = null;
    const flight = createFlight({ from, to: at(album.city), rot });
    leg = { flight, city: album.city, end: null, fromHome };
    set({
      focus: index,
      atHome: false,
      endCard: null,
      progress: true,
      flying: true,
      flightKm: flight.km > 0 ? flight.km : null,
    });
  };

  /** Fly there; if no flight was needed, rest there before the next step. */
  const go = (index: number) => {
    flyTo(index);
    if (!leg) dwell = dwellMs();
  };

  /** The last leg of a trip: to its end, home or another city, with the end card in the panel. */
  const flyEnd = (end: Endpoint) => {
    const { focus, tour } = get();
    const last = albums[focus];
    if (!last) {
      set({ tour: null });
      stop();
      return;
    }
    const place = endpointPlace(end, archive, home);
    const flight = createFlight({ from: at(last.city), to: [place.lon, place.lat], rot });
    leg = { flight, city: null, end, fromHome: false };
    set({
      flying: true,
      flightKm: flight.km > 0 ? flight.km : null,
      lastTour: tour,
      endCard: { home: place.cityKey === null, cityKey: place.cityKey, fromAlbumId: last.id, tour },
    });
  };

  const playNext = () => {
    dwell = 0;
    const { playing, tour, focus, range } = get();
    if (!playing) return;
    const step = nextStep(tour, focus, times, range);
    if (step.kind === 'album') go(step.index);
    else if (step.kind === 'end') flyEnd(step.end);
    else if (tour) {
      // a year ends at its last album: the tour ended by itself
      dwell = 0;
      set({ playing: false, tourDone: get().tourDone + 1 });
    } else stop();
  };

  const arrive = () => {
    const done = leg;
    if (!done) return;
    leg = null;
    if (done.flight.path) lastLeg = { path: done.flight.path, end: now };
    if (done.city) pulseAt.set(done.city.key, now);
    const patch: Partial<AppState> = { flying: false, flightKm: null };
    if (done.end) {
      origin = done.flight.to;
      const card = get().endCard;
      if (card?.cityKey) pulseAt.set(card.cityKey, now);
      else homePulseAt = now;
      patch.atHome = card?.home ?? true;
      patch.tour = null;
      patch.playing = false;
      patch.tourDone = get().tourDone + 1;
      dwell = 0;
    }
    set(patch);
    if (get().playing) dwell = dwellMs();
  };

  const deselect = () => {
    leg = null;
    lastLeg = null;
    origin = null;
    dwell = 0;
    set({
      focus: -1,
      atHome: false,
      endCard: null,
      tour: null,
      playing: false,
      flying: false,
      flightKm: null,
    });
  };

  /** The place in focus without a flight: the light pulses, the panel shows its photos. */
  const focusOn = (index: number) => {
    const album = albums[index];
    if (!album) return;
    leg = null;
    set({ focus: index, atHome: false, endCard: null, progress: true, flying: false, flightKm: null });
    pulseAt.set(album.city.key, now);
  };

  /** Turns the camera at once; a flight started right after starts from this view. */
  const snapTo = ([lon, lat]: LonLat) => {
    snap = [-lon, -lat, 0];
    rot = snap;
  };

  /** Leave whatever was on: "Show on map" starts clean. */
  const toMap = () => {
    if (get().focus >= 0 || get().endCard) deselect();
    stop();
    set({ tour: null, picking: null });
  };

  const view = (): DirectorView => {
    const { focus, progress, range, picking, endCard, atHome } = get();
    const live = picking ?? range;
    const state = { on: progress, focus, ahead: leg !== null && leg.end === null, range };
    const reachedFlags = albums.map((_, k) => isReached(k, timeOf(k), state));
    const reached = new Set<string>();
    const inLive = new Set<string>();
    const route: [LonLat, LonLat][] = [];
    albums.forEach((album, k) => {
      if (reachedFlags[k]) reached.add(album.city.key);
      if (live && within(timeOf(k), live)) inLive.add(album.city.key);
      const previous = albums[k - 1];
      if (k > 0 && k <= focus && previous && reachedFlags[k - 1] && reachedFlags[k]) {
        route.push([at(previous.city), at(album.city)]);
      }
    });

    const flight = leg?.flight;
    let legView: LegView | null = null;
    if (flight) {
      legView = flight.path ? { path: flight.path, upto: flight.e, alpha: 0.9 } : null;
    } else if (lastLeg) {
      const alpha = clamp(1 - (now - lastLeg.end) / LEG_FADE_MS, 0.25, 0.9);
      legView = { path: lastLeg.path, upto: 1, alpha };
    }
    const plane =
      flight?.path && flight.phase !== 'done'
        ? {
            at: flight.path(flight.e),
            behind: flight.path(Math.max(0, flight.e - 0.003)),
            ahead: flight.path(Math.min(1, flight.e + 0.003)),
            alpha: planeAlpha(flight),
          }
        : null;

    const standing = leg !== null && leg.fromHome && leg.flight.phase === 'appear';
    return {
      focusCityKey: focus >= 0 && !leg && !endCard ? (albums[focus]?.city.key ?? null) : null,
      reached,
      inLive,
      rangeActive: live !== null,
      homeLit: atHome || standing ? 1 : 0,
      homePulseAt,
      pulseAt,
      route,
      leg: legView,
      plane,
      now,
    };
  };

  return {
    step(dt: number, current: Rotation, z: number): Drive {
      now += dt;
      rot = current;
      let turnTo: Rotation | null = null;
      if (snap) {
        turnTo = snap;
        rot = snap;
        snap = null;
      }
      let zoom = z;
      if (leg) {
        const flight = leg.flight;
        stepFlight(flight, dt, pace().flightMs);
        if (flight.follow) {
          turnTo = euler(slerp(flight.q0, flight.q1, flight.c));
          rot = turnTo;
        }
        zoom = riseZoom(z, flight);
        if (flight.phase === 'done') arrive();
      }
      if (dwell > 0) {
        dwell -= dt;
        if (dwell <= 0) playNext();
      }
      return { rot: turnTo, zoom, steering: turnTo !== null };
    },

    view,

    /** A place is in focus: the Earth does not spin by itself. */
    get focused(): boolean {
      return get().focus >= 0;
    },

    /** A light was clicked: its album inside the tour or the range, or its earliest one. */
    pickCity(cityKey: string) {
      const own = cityAlbums(archive, cityKey);
      if (own.length === 0) return;
      stop();
      const before = get().tour;
      if (before && !own.some((index) => before.list.includes(index))) leaveTour();
      const { tour, range, focus, endCard } = get();
      const index =
        (tour ? own.find((i) => tour.list.includes(i)) : undefined) ??
        own.find((i) => within(timeOf(i), range)) ??
        own[0];
      if (index === undefined) return;
      const landedHere = !leg && !endCard && albums[focus]?.city.key === cityKey;
      if (!landedHere) flyTo(index);
    },

    /** An album of the place in focus, from the panel. */
    selectAlbum(index: number) {
      stop();
      showAlbum(index);
    },

    /** The owner dragged the globe: the camera lets go, the plane flies on. */
    letGo() {
      if (leg) leg.flight.follow = false;
    },

    deselect,

    /** After an edit: the albums are new, so their times and the first year are worked out again. */
    refresh() {
      times = albums.map(albumTime);
      [firstYear] = span(times);
    },

    /** Esc on the main screen: let go of the place, then of the range. */
    escape() {
      if (get().focus >= 0 || get().endCard) deselect();
      else {
        pickFrom = null;
        set({ range: null, picking: null });
      }
    },

    play() {
      const { playing, tour, focus, endCard } = get();
      if (playing) {
        stop();
        return;
      }
      // mid-flight, play only resumes: the plane lands where it was going, then the tour goes on
      if (leg) {
        set({ playing: true });
        return;
      }
      if (tour && focus >= 0 && !endCard) {
        set({ playing: true });
        const at = tour.list.indexOf(focus);
        const first = tour.list[0];
        // at the last album of a year, ▶ plays the year again
        if (!tour.end && at === tour.list.length - 1 && first !== undefined) go(first);
        else playNext();
        return;
      }
      set({ tour: null, playing: true });
      const { range } = get();
      const next = nextInRange(focus, 1, times, range);
      const index = next >= 0 ? next : nextInRange(-1, 1, times, range);
      if (index < 0) stop();
      else go(index);
    },

    stop,

    /** ← → : the previous or next album in the range. */
    next(dir: 1 | -1) {
      stop();
      const index = nextInRange(get().focus, dir, times, get().range);
      if (index >= 0) flyTo(index);
    },

    /** ↑ ↓ : the albums of the place in focus, in a loop. */
    scroll(dir: 1 | -1) {
      const album = albums[get().focus];
      if (!album || get().endCard) return;
      const list = scopedAlbums(cityAlbums(archive, album.city.key), get().tour);
      const at = list.indexOf(get().focus);
      const index = list[(((at + dir) % list.length) + list.length) % list.length];
      stop();
      if (index !== undefined) showAlbum(index);
    },

    beginPick(t: number) {
      pickFrom = t;
      set({ range: null, picking: { lo: t, hi: t } });
    },

    movePick(t: number) {
      if (pickFrom === null) return;
      set({ picking: { lo: Math.min(pickFrom, t), hi: Math.max(pickFrom, t) } });
    },

    endPick(t: number, moved: boolean): 'ok' | 'empty' {
      const start = pickFrom ?? t;
      pickFrom = null;
      leaveTour();
      const next = pickedRange(start, t, moved, firstYear);
      if (!times.some((time) => within(time, next))) {
        set({ range: null, picking: null });
        return 'empty';
      }
      set({ range: next, picking: null, progress: false });
      return 'ok';
    },

    cancelPick() {
      pickFrom = null;
      set({ picking: null });
    },

    /** A year on the timeline: picks it; the picked year again asks for the archive. */
    clickYear(year: number): 'ok' | 'empty' | 'open' {
      if (!albums.some((album) => album.year === year)) return 'empty';
      if (get().range?.year === year) return 'open';
      leaveTour();
      set({ range: yearRange(year), picking: null, progress: false });
      return 'ok';
    },

    clearRange() {
      pickFrom = null;
      set({ range: null, picking: null });
    },

    /** Show on map: a year. Its first album in focus, then the tour plays the year. */
    showYear(year: number): boolean {
      const tour = yearTour(year, archive);
      const first = tour?.list[0];
      const album = first === undefined ? undefined : albums[first];
      if (!tour || first === undefined || !album) return false;
      toMap();
      set({ range: yearRange(year), tour });
      snapTo(at(album.city));
      focusOn(first);
      set({ playing: true });
      dwell = dwellMs();
      return true;
    },

    /** Show on map: a trip. The globe looks at its start and the plane takes off from there. */
    showTrip(tripId: string): boolean {
      const trip = archive.trips.find((t) => t.id === tripId);
      const tour = trip ? tripTour(trip, archive) : null;
      const first = tour?.list[0];
      const last = tour?.list[tour.list.length - 1];
      if (!trip || !tour || first === undefined || last === undefined) return false;
      toMap();
      set({ range: { lo: timeOf(first), hi: timeOf(last) }, tour });
      const start = endpointPlace(trip.start, archive, home);
      snapTo([start.lon, start.lat]);
      origin = [start.lon, start.lat];
      set({ playing: true });
      flyTo(first);
      return true;
    },

    /** Show on map: one album. Its moment on the timeline, its place in focus, no autoplay. */
    showAlbumOnMap(albumId: string): boolean {
      const index = albums.findIndex((album) => album.id === albumId);
      const album = albums[index];
      if (!album) return false;
      toMap();
      set({ range: { lo: timeOf(index), hi: timeOf(index) } });
      snapTo(at(album.city));
      focusOn(index);
      return true;
    },
  };
};

export type Director = ReturnType<typeof createDirector>;
