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
import { APPEAR_MS, ESCAPE_MS, ESCAPE_TURN_MS, VANISH_MS } from './flight';

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
      if (store.get().focus !== before)
        changes.push({ focus: store.get().focus, flying: store.get().flying });
    }
  };
  const state = () => store.get();
  const centre = () => geoRotation(rot).invert([0, 0]);
  return { store, director, run, state, centre, changes };
};

describe('picking a place', () => {
  it('flies from home to the earliest album of the place', () => {
    const { director, run, state } = setup();
    director.pickCity('athens');
    expect(state().focus).toBe(indexOf('Acropolis at sunrise'));
    expect(state().flying).toBe(true);
    expect(state().flightKm).toBeGreaterThan(2450);
    expect(state().flightKm).toBeLessThan(2520);
    // the plane stands at home before take-off: the house is lit
    expect(director.view().homeLit).toBe(1);
    run(APPEAR_MS + 40);
    expect(director.view().homeLit).toBe(0);
    expect(director.view().plane).not.toBeNull();
    run(LEG_MS);
    expect(state().flying).toBe(false);
    expect(director.view().focusCityKey).toBe('athens');
    expect(director.view().pulseAt.get('athens')).toBeGreaterThan(0);
  });

  it('turns the camera onto the place on landing', () => {
    const { director, run, centre } = setup();
    director.pickCity('athens');
    run(LEG_MS);
    expect(geoDistance(centre(), [23.73, 37.98])).toBeLessThan(0.01);
  });

  it('switches albums in the same city without a flight', () => {
    const { director, run, state } = setup();
    director.pickCity('montevideo');
    run(LEG_MS);
    director.selectAlbum(indexOf('Montevideo again'));
    expect(state().focus).toBe(indexOf('Montevideo again'));
    expect(state().flying).toBe(false);
    director.pickCity('montevideo');
    expect(state().flying).toBe(false);
  });

  it('redirects from mid-air', () => {
    const { director, run, state } = setup();
    director.pickCity('athens');
    run(APPEAR_MS + FLIGHT_MS / 2);
    director.pickCity('valletta');
    const fromHalfway = state().flightKm ?? 0;
    // Saint Petersburg → Valletta is about 2900 km; from halfway to Athens it is much shorter
    expect(fromHalfway).toBeGreaterThan(0);
    expect(fromHalfway).toBeLessThan(2000);
  });

  it('lets go of the camera when the owner drags during a flight', () => {
    const { director, run, state } = setup();
    director.pickCity('athens');
    run(APPEAR_MS + 100);
    director.letGo();
    expect(director.step(20, [0, 0, 0], 1).rot).toBeNull();
    run(LEG_MS);
    expect(state().flying).toBe(false);
    expect(director.view().focusCityKey).toBe('athens');
  });

  it('waits while the world is paused', () => {
    const { director, state } = setup();
    director.pickCity('athens');
    for (let i = 0; i < 500; i++) director.step(0, [0, 0, 0], 1);
    expect(state().flying).toBe(true);
    expect(director.view().homeLit).toBe(1);
  });

  it('lets go of the place and then of the range on Esc', () => {
    const { director, run, state } = setup();
    director.clickYear(2016);
    director.pickCity('athens');
    run(LEG_MS);
    director.escape();
    expect(state().focus).toBe(-1);
    expect(state().range?.year).toBe(2016);
    director.escape();
    expect(state().range).toBeNull();
  });
});

describe('the timeline', () => {
  it('picks a dragged stretch and starts the yellow over', () => {
    const { director, run, state } = setup();
    director.pickCity('athens');
    run(LEG_MS);
    expect(director.view().reached.has('athens')).toBe(true);
    director.beginPick(2019);
    director.movePick(2020.5);
    expect(state().picking).toEqual({ lo: 2019, hi: 2020.5 });
    expect(director.endPick(2020.5, true)).toBe('ok');
    expect(state().range).toEqual({ lo: 2019, hi: 2020.5 });
    expect(state().progress).toBe(false);
    const view = director.view();
    expect(view.reached.size).toBe(0);
    expect(view.inLive.has('montevideo')).toBe(true);
    expect(view.inLive.has('athens')).toBe(false);
    expect(placeFacts(view, 'valletta')).toEqual({
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
    expect(director.clickYear(2020)).toBe('ok');
    expect(state().range?.year).toBe(2020);
    expect(director.clickYear(2020)).toBe('open');
  });

  it('keeps a picked year picked, instead of opening it, when told not to open', () => {
    const { director, state } = setup();
    director.clickYear(2020);
    expect(director.clickYear(2020, false)).toBe('ok');
    expect(state().range?.year).toBe(2020);
  });

  it('refuses a year without albums', () => {
    const { director, state } = setup();
    expect(director.clickYear(2027)).toBe('empty');
    expect(state().range).toBeNull();
  });
});

describe('review findings', () => {
  it('keeps the destination when paused and played again mid-flight', () => {
    const { director, run, state } = setup();
    director.showYear(2020);
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
    director.showTrip(tripId('Mediterranean autumn'));
    run(APPEAR_MS - 100);
    expect(geoDistance(centre(), [DEMO_HOME.lon, DEMO_HOME.lat])).toBeLessThan(0.01);
  });
});

describe('tours', () => {
  it('flies a trip from its start through its albums and home, with the light on', () => {
    const { director, run, state, changes } = setup();
    expect(director.showTrip(tripId('Mediterranean autumn'))).toBe(true);
    expect(state().tour?.name).toBe('Mediterranean autumn');
    expect(state().playing).toBe(true);
    expect(state().flying).toBe(true);
    run(40000);
    expect(state().atHome).toBe(true);
    expect(state().endCard?.home).toBe(true);
    expect(state().playing).toBe(false);
    expect(state().tour).toBeNull();
    expect(state().lastTour?.name).toBe('Mediterranean autumn');
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
    expect(director.showYear(2020)).toBe(true);
    const tour = state().tour;
    expect(state().range?.year).toBe(2020);
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
    director.showYear(2020);
    const first = state().focus;
    run(DWELL_MIN_MS - 200);
    expect(state().focus).toBe(first);
  });

  it('leaves a tour when a light outside it is picked', () => {
    const { director, state } = setup();
    director.showYear(2020);
    director.pickCity('athens');
    expect(state().tour).toBeNull();
    expect(state().focus).toBe(indexOf('Acropolis at sunrise'));
  });

  it('plays the range from its start', () => {
    const { director, state } = setup();
    director.clickYear(2019);
    director.play();
    const first = archive.albums[state().focus];
    expect(first?.year).toBe(2019);
    expect(state().playing).toBe(true);
  });

  it('counts a year that ends by itself, and a trip that lands at its end', () => {
    const year = setup();
    year.director.showYear(2020);
    year.run(60000);
    expect(year.state().tourDone).toBe(1);
    const trip = setup();
    trip.director.showTrip(tripId('Mediterranean autumn'));
    trip.run(40000);
    expect(trip.state().tourDone).toBe(1);
  });

  it('does not count a tour the owner interrupted', () => {
    const { director, run, state } = setup();
    director.showYear(2020);
    run(3000);
    director.escape();
    run(60000);
    expect(state().tourDone).toBe(0);
  });

  it('shows one album on the map without playing', () => {
    const { director, state } = setup();
    const index = indexOf('Tram 28 and tiles');
    expect(director.showAlbumOnMap(archive.albums[index]?.id ?? '')).toBe(true);
    const t = albumTime(archive.albums[index] ?? { year: 0, month: 1, day: 1, time: '00:00' });
    expect(state().range).toEqual({ lo: t, hi: t });
    expect(state().focus).toBe(index);
    expect(state().playing).toBe(false);
    expect(state().flying).toBe(false);
  });
});

describe('playing everything with no tour', () => {
  it('flies home after each trip, and does not count it as a tour that ended', () => {
    const { director, run, state } = setup();
    const homes: (string | undefined)[] = [];
    director.play();
    let had = false;
    for (let t = 0; t < 1000000; t += 20) {
      run(20);
      const card = state().endCard;
      if (card && !had) homes.push(archive.albums[state().focus]?.title);
      had = card !== null;
      if (t > 1000 && !state().playing && !state().flying) break;
    }
    // one way home after each trip, the last album of it in time
    expect(homes).toEqual([
      'Tram 28 and tiles',
      'Two continents by ferry',
      'Fog and gondolas',
      'Amber coast',
      'Wine and balconies',
      'Ararat at dawn',
      'Canals and bicycles',
      'Sakura week',
      'Seven days in Manhattan',
      'Gaudí and the sea',
    ]);
    expect(state().atHome).toBe(true);
    expect(state().endCard?.home).toBe(true);
    expect(state().playing).toBe(false);
    expect(state().tourDone).toBe(0);
  });
});

describe('the line of the way already flown', () => {
  const key = (a: readonly number[], b: readonly number[]) =>
    `${a.map((x) => x.toFixed(2))}>${b.map((x) => x.toFixed(2))}`;
  const home = [DEMO_HOME.lon, DEMO_HOME.lat];
  const city = (name: string) => {
    const found = archive.cities.find((c) => c.name === name);
    if (!found) throw new Error(name);
    return [found.lon, found.lat];
  };
  const lines = (director: ReturnType<typeof setup>['director']) =>
    director.view().route.map(([a, b]) => key(a, b));

  it('runs from home to the first place of a trip and back home after the last', () => {
    const { director, run } = setup();
    director.showTrip(tripId('Mediterranean autumn'));
    run(40000);
    const drawn = lines(director);
    expect(drawn).toContain(key(home, city('Sevastopol')));
    expect(drawn).toContain(key(city('Sevastopol'), city('Athens')));
    expect(drawn).toContain(key(city('Lisbon'), home));
  });

  it('goes through home between two trips instead of straight from one to the next', () => {
    const { director, run, state } = setup();
    director.play();
    for (let t = 0; t < 1000000 && (t < 1000 || state().playing || state().flying); t += 20)
      run(20);
    const drawn = lines(director);
    expect(drawn).toContain(key(city('Lisbon'), home));
    expect(drawn).toContain(key(home, city('Rio de Janeiro')));
    expect(drawn).not.toContain(key(city('Lisbon'), city('Rio de Janeiro')));
    expect(drawn).toContain(key(city('Kaliningrad'), home));
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

describe('choosing a range while the plane is in the air', () => {
  // Athens is visited in 2016; 2019 holds other albums
  const flyingToAthens = () => {
    const made = setup();
    made.director.pickCity('athens');
    made.run(APPEAR_MS + 400);
    expect(made.state().flying).toBe(true);
    return made;
  };
  const athensYear = () => archive.albums[indexOf('Acropolis at sunrise')]?.year ?? 0;

  it('lets it fly on when the place it is heading for is inside the range', () => {
    const { director, run, state } = flyingToAthens();
    expect(director.clickYear(athensYear())).toBe('ok');
    run(200);
    expect(state().flying).toBe(true);
    expect(director.view().plane?.lift ?? 0).toBe(0);
    run(LEG_MS);
    expect(state().flying).toBe(false);
    expect(director.view().focusCityKey).toBe('athens');
  });

  it('sends it into space when the place is outside the range, and the trail goes at once', () => {
    const { director, run, state } = flyingToAthens();
    const other = 2019;
    expect(director.clickYear(other)).toBe('ok');
    run(120);
    // first it turns its nose up where it is: the turn has begun, the climb has not
    expect(director.view().plane?.turn).toBeGreaterThan(0);
    expect(director.view().plane?.lift).toBe(0);
    run(ESCAPE_TURN_MS + 300);
    expect(director.view().plane?.lift).toBeGreaterThan(0);
    expect(director.view().leg?.alpha ?? 0).toBeLessThan(0.2);
    run(ESCAPE_MS);
    expect(director.view().plane).toBeNull();
    expect(director.view().leg).toBeNull();
    expect(state().flying).toBe(false);
    expect(state().focus).toBe(-1);
    expect(state().range?.year).toBe(other);
  });

  it('does not treat a range with no flight in it as anything to do', () => {
    const { director, state } = setup();
    expect(director.clickYear(2020)).toBe('ok');
    expect(state().flying).toBe(false);
    expect(director.view().plane).toBeNull();
  });
});
