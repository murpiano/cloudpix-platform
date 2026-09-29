import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoDistance, geoRotation } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import { linkArchive, relinkInto } from '@/data/archive';
import { addAlbum } from '@/data/edits';
import { buildDemo, DEMO_HOME } from '@/data/demo';
import type { Credit } from '@/data/types';
import type { Rotation } from '@/geo/camera';
import { INITIAL_STATE } from '@/state/app-state';
import type { AppState } from '@/state/app-state';
import { createStore } from '@/state/store';
import { albumTime } from '@/timeline/range';
import { createDirector, DWELL_MIN_MS, placeFacts } from './director';
import { APPEAR_MS, VANISH_MS } from './flight';

const file = fileURLToPath(new URL('../../public/demo/photos.json', import.meta.url));
const credits = JSON.parse(readFileSync(file, 'utf8')) as Credit[];
const archive = linkArchive(buildDemo(credits));
const FLIGHT_MS = 1000;
const LEG_MS = APPEAR_MS + FLIGHT_MS + VANISH_MS + 100;
const indexOf = (title: string) => archive.albums.findIndex((a) => a.title === title);
const tripId = (name: string) => archive.trips.find((t) => t.name === name)?.id ?? '';

const setup = () => {
  const store = createStore<AppState>({ ...INITIAL_STATE });
  const director = createDirector({
    archive,
    home: DEMO_HOME,
    store,
    pace: () => ({ photoMs: 1000, flightMs: FLIGHT_MS }),
  });
  let rot: Rotation = [-10, -35, 0];
  const changes: { focus: number; flying: boolean }[] = [];
  const run = (ms: number) => {
    for (let t = 0; t < ms; t += 20) {
      const before = store.get().focus;
      const drive = director.step(20, rot, 1);
      if (drive.rot) rot = drive.rot;
      if (store.get().focus !== before) changes.push({ focus: store.get().focus, flying: store.get().flying });
    }
  };
  const state = () => store.get();
  const centre = () => geoRotation(rot).invert([0, 0]);
  return { store, director, run, state, centre, changes };
};

describe('picking a place', () => {
  it('flies from home to the earliest album of the place', () => {
    const { director, run, state } = setup();
    director.pickCity('paris');
    expect(state().focus).toBe(indexOf('First trip abroad'));
    expect(state().flying).toBe(true);
    expect(state().flightKm).toBeGreaterThan(1990);
    expect(state().flightKm).toBeLessThan(2060);
    // the plane stands at home before take-off: the house is lit
    expect(director.view().homeLit).toBe(1);
    run(APPEAR_MS + 40);
    expect(director.view().homeLit).toBe(0);
    expect(director.view().plane).not.toBeNull();
    run(LEG_MS);
    expect(state().flying).toBe(false);
    expect(director.view().focusCityKey).toBe('paris');
    expect(director.view().pulseAt.get('paris')).toBeGreaterThan(0);
  });

  it('turns the camera onto the place on landing', () => {
    const { director, run, centre } = setup();
    director.pickCity('paris');
    run(LEG_MS);
    expect(geoDistance(centre(), [2.35, 48.86])).toBeLessThan(0.01);
  });

  it('switches albums in the same city without a flight', () => {
    const { director, run, state } = setup();
    director.pickCity('paris');
    run(LEG_MS);
    director.selectAlbum(indexOf('Paris again'));
    expect(state().focus).toBe(indexOf('Paris again'));
    expect(state().flying).toBe(false);
    director.pickCity('paris');
    expect(state().flying).toBe(false);
  });

  it('redirects from mid-air', () => {
    const { director, run, state } = setup();
    director.pickCity('paris');
    run(APPEAR_MS + FLIGHT_MS / 2);
    director.pickCity('rome');
    const fromHalfway = state().flightKm ?? 0;
    // Kyiv → Rome is about 1680 km; from halfway to Paris it is much shorter
    expect(fromHalfway).toBeGreaterThan(0);
    expect(fromHalfway).toBeLessThan(1400);
  });

  it('lets go of the camera when the owner drags during a flight', () => {
    const { director, run, state } = setup();
    director.pickCity('paris');
    run(APPEAR_MS + 100);
    director.letGo();
    expect(director.step(20, [0, 0, 0], 1).rot).toBeNull();
    run(LEG_MS);
    expect(state().flying).toBe(false);
    expect(director.view().focusCityKey).toBe('paris');
  });

  it('waits while the world is paused', () => {
    const { director, state } = setup();
    director.pickCity('paris');
    for (let i = 0; i < 500; i++) director.step(0, [0, 0, 0], 1);
    expect(state().flying).toBe(true);
    expect(director.view().homeLit).toBe(1);
  });

  it('lets go of the place and then of the range on Esc', () => {
    const { director, run, state } = setup();
    director.clickYear(2022);
    director.pickCity('paris');
    run(LEG_MS);
    director.escape();
    expect(state().focus).toBe(-1);
    expect(state().range?.year).toBe(2022);
    director.escape();
    expect(state().range).toBeNull();
  });
});

describe('the timeline', () => {
  it('picks a dragged stretch and starts the yellow over', () => {
    const { director, run, state } = setup();
    director.pickCity('paris');
    run(LEG_MS);
    expect(director.view().reached.has('paris')).toBe(true);
    director.beginPick(2019);
    director.movePick(2020.5);
    expect(state().picking).toEqual({ lo: 2019, hi: 2020.5 });
    expect(director.endPick(2020.5, true)).toBe('ok');
    expect(state().range).toEqual({ lo: 2019, hi: 2020.5 });
    expect(state().progress).toBe(false);
    const view = director.view();
    expect(view.reached.size).toBe(0);
    expect(view.inLive.has('barcelona')).toBe(true);
    expect(view.inLive.has('tokyo')).toBe(false);
    expect(placeFacts(view, 'tokyo')).toEqual({
      focused: false,
      reached: false,
      inRange: false,
      rangeActive: true,
    });
  });

  it('picks everything from the start with a click', () => {
    const { director, state } = setup();
    director.beginPick(2018.5);
    director.endPick(2018.5, false);
    expect(state().range).toEqual({ lo: 2016, hi: 2018.5 });
  });

  it('refuses a stretch with no album', () => {
    const { director, state } = setup();
    director.beginPick(2016.9);
    expect(director.endPick(2016.95, true)).toBe('empty');
    expect(state().range).toBeNull();
    expect(state().picking).toBeNull();
  });

  it('picks a year, and asks for the archive on a second click', () => {
    const { director, state } = setup();
    expect(director.clickYear(2023)).toBe('ok');
    expect(state().range?.year).toBe(2023);
    expect(director.clickYear(2023)).toBe('open');
  });

  it('refuses a year without albums', () => {
    const { director, state } = setup();
    expect(director.clickYear(2026)).toBe('empty');
    expect(state().range).toBeNull();
  });
});

describe('review findings', () => {
  it('keeps the destination when paused and played again mid-flight', () => {
    const { director, run, state } = setup();
    director.showYear(2023);
    run(DWELL_MIN_MS + APPEAR_MS + 200);
    expect(state().flying).toBe(true);
    const target = state().focus;
    director.play();
    expect(state().playing).toBe(false);
    director.play();
    expect(state().playing).toBe(true);
    expect(state().focus).toBe(target);
    expect(state().flying).toBe(true);
  });

  it('looks at the start of a trip shown on the map', () => {
    const { director, run, centre } = setup();
    director.showTrip(tripId('Japan in bloom'));
    run(APPEAR_MS - 100);
    expect(geoDistance(centre(), [DEMO_HOME.lon, DEMO_HOME.lat])).toBeLessThan(0.01);
  });
});

describe('tours', () => {
  it('flies a trip from its start through its albums and home, with the light on', () => {
    const { director, run, state, changes } = setup();
    expect(director.showTrip(tripId('Japan in bloom'))).toBe(true);
    expect(state().tour?.name).toBe('Japan in bloom');
    expect(state().playing).toBe(true);
    expect(state().flying).toBe(true);
    run(40000);
    expect(state().atHome).toBe(true);
    expect(state().endCard?.home).toBe(true);
    expect(state().playing).toBe(false);
    expect(state().tour).toBeNull();
    expect(state().lastTour?.name).toBe('Japan in bloom');
    expect(director.view().homeLit).toBe(1);
    expect(director.view().homePulseAt).toBeGreaterThan(0);
    // albums in the same city switch without a flight
    for (let k = 1; k < changes.length; k++) {
      const a = archive.albums[changes[k - 1]?.focus ?? -1];
      const b = archive.albums[changes[k]?.focus ?? -1];
      if (a && b && a.city === b.city) expect(changes[k]?.flying).toBe(false);
    }
  });

  it('shows a year, starts at its first album and stops at its last', () => {
    const { director, run, state } = setup();
    expect(director.showYear(2023)).toBe(true);
    const tour = state().tour;
    expect(state().range?.year).toBe(2023);
    expect(state().focus).toBe(tour?.list[0]);
    expect(state().flying).toBe(false);
    expect(state().playing).toBe(true);
    run(60000);
    expect(state().focus).toBe(tour?.list[tour.list.length - 1]);
    expect(state().playing).toBe(false);
    expect(state().endCard).toBeNull();
    // ▶ plays the year again
    director.play();
    expect(state().focus).toBe(tour?.list[0]);
  });

  it('rests on each place before flying on', () => {
    const { director, run, state } = setup();
    director.showYear(2023);
    const first = state().focus;
    run(DWELL_MIN_MS - 200);
    expect(state().focus).toBe(first);
  });

  it('leaves a tour when a light outside it is picked', () => {
    const { director, state } = setup();
    director.showYear(2023);
    director.pickCity('cusco');
    expect(state().tour).toBeNull();
    expect(state().focus).toBe(indexOf('Up to Machu Picchu'));
  });

  it('plays the range from its start', () => {
    const { director, state } = setup();
    director.clickYear(2017);
    director.play();
    const first = archive.albums[state().focus];
    expect(first?.year).toBe(2017);
    expect(state().playing).toBe(true);
  });

  it('counts a year that ends by itself, and a trip that lands at its end', () => {
    const year = setup();
    year.director.showYear(2023);
    year.run(60000);
    expect(year.state().tourDone).toBe(1);
    const trip = setup();
    trip.director.showTrip(tripId('Japan in bloom'));
    trip.run(40000);
    expect(trip.state().tourDone).toBe(1);
  });

  it('does not count a tour the owner interrupted', () => {
    const { director, run, state } = setup();
    director.showYear(2023);
    run(3000);
    director.escape();
    run(60000);
    expect(state().tourDone).toBe(0);
  });

  it('shows one album on the map without playing', () => {
    const { director, state } = setup();
    const index = indexOf('Tram 28');
    expect(director.showAlbumOnMap(archive.albums[index]?.id ?? '')).toBe(true);
    const t = albumTime(archive.albums[index] ?? { year: 0, month: 1, day: 1, time: '00:00' });
    expect(state().range).toEqual({ lo: t, hi: t });
    expect(state().focus).toBe(index);
    expect(state().playing).toBe(false);
    expect(state().flying).toBe(false);
  });
});

describe('after the owner has changed the archive', () => {
  const PORTO = { name: 'Porto', country: 'Portugal', countryId: '620', lat: 41.15, lon: -8.61 };

  it('flies to an album that was added after it was made', () => {
    const own = linkArchive(buildDemo(credits));
    const store = createStore<AppState>({ ...INITIAL_STATE });
    const director = createDirector({
      archive: own,
      home: DEMO_HOME,
      store,
      pace: () => ({ photoMs: 1000, flightMs: FLIGHT_MS }),
    });
    const made = addAlbum(own.data, 'new-one', {
      title: 'Later',
      year: 2030,
      month: 6,
      day: 1,
      time: '10:00',
      place: PORTO,
      tripId: null,
    });
    relinkInto(own, own.data);
    director.refresh();

    expect(director.showAlbumOnMap(made.id)).toBe(true);
    expect(store.get().focus).toBe(own.albums.findIndex((album) => album.id === made.id));
    expect(director.clickYear(2030)).toBe('ok');
  });
});
