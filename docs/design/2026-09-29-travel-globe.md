# CloudPix: travel globe — design

Status: approved in prototype form on 2026-09-29, waiting for review of this written version.
Reference prototype: [`prototype/flight.html`](prototype/flight.html) with
[`prototype/atlas-data.js`](prototype/atlas-data.js). It is one throwaway file; this document
describes what to build properly. When the two disagree, this document wins.

## 1. Goal

CloudPix becomes a personal travel archive. One owner keeps where they have been: countries,
cities, albums of photos and the trips that tie albums together. Visitors see it on a night
globe: lights for places, a timeline of years, and a plane that flies the trips in order.

The new app replaces the current CloudPix (the sphere of photos, the studio with effects). The
old code stays in git history. The stack stays: TypeScript, SCSS, Vite, Vitest, no UI
framework. New runtime dependencies: `d3-geo`, `topojson-client`.

Success means:

- Logged out, the app runs a demo traveller on the globe with no setup.
- Logged in, the owner can create, edit and delete trips, albums and photos, and all of it
  survives a reload.
- The globe keeps 60 fps on a laptop and stays usable on a phone at 390 px.

## 2. Modes

- **Demo (logged out).** A built-in sample archive: 12 countries, 22 cities, 32 albums,
  23 trips, stock photos from Wikimedia Commons with credits. Home is Kyiv. The globe, the
  timeline, the tour, the album panel and the photo window work. The archive, editing and every
  link into the archive ask the visitor to log in. Nothing is saved.
- **Owner (logged in).** The owner's own archive. On the first login it starts as a copy of the
  demo, so there is something to explore. Every change is saved. "Reset archive to the demo" in
  the account settings starts over. Logging out returns to the untouched demo.

Login is local for now: name, email, password (not stored) and a home base. The real backend
comes later (section 9).

## 3. Main screen

### 3.1 Globe

- A night Earth drawn on canvas: ocean, land, borders, faint city lights, atmosphere.
- **Spin.** It turns slowly about its axis from the start. It never stops by itself unless a
  place is in focus.
- **Drag.** It turns like a trackball about the screen axes, in any direction, over the poles.
  A throw keeps the motion going, then settles into the slow spin.
- **Zoom.** The wheel or a pinch zooms. At the farthest it is a ball half the resting size.
  Zooming in to a fixed wheel notch plays a 1.1 s animation that unrolls the whole ball into a
  flat equirectangular map filling the screen. On the flat map a drag pans and nothing spins.
  Zooming out past the same notch rolls it back. The notch sits three notches before the ball
  would touch the screen edge, and never at the resting size.
- **Unroll math.** `x = (1 − t)·cos φ sin λ + t·λ`, `y = (1 − t)·sin φ + t·φ`. Clip at
  `acos(−t/(1 − t))` while `t < .5`, composed with the antimeridian clip. From `t = .5` use the
  antimeridian clip only. The flat map keeps its centre latitude inside the limit where the
  world's edge would show.
- **Sky.** Behind the globe:
  - the star field drifts very slowly;
  - about 30 stars twinkle, and the brightest get a small glint;
  - every 7–20 s either a slow meteor (about 2.5 s) or a satellite (16–24 s) crosses.

### 3.2 Places on the globe

| State | When | Look |
|---|---|---|
| plain | nothing active on the timeline | small pale dot, no glow |
| grey | a range is picked, place outside it | grey dot |
| blue | inside the picked range, not reached yet | star blue `#8fb8ff` dot and glow |
| yellow | reached: on the timeline up to the trip in focus | lamp yellow `#ffc86b`, soft glow |
| current | the place in focus after the plane lands | brightest and 1.45× bigger |

- All changes fade (about 0.4 s).
- On landing the new place pulses once. The pulse is a raised cosine over 1.5 s, with no jolt
  at either end.
- On hover a label fades in with the city, the country and the years of visits, and the cursor
  becomes a pointer.

### 3.3 Home

- An isometric house in the reference style: lilac walls, thick purple roof, 2×2 window,
  square chimney. On the globe it is small, about half the width of a city label.
- The same drawing, as SVG, sits next to the home base in the menu.
- **Light and smoke.** The windows light up and soft smoke rises from the chimney while the
  plane stands at home before take-off, and again after it lands at home. Once the plane leaves,
  the light fades and the smoke stops.
- When the plane lands at home, the house pulses once.

### 3.4 Flights

A flight goes along the great circle and has four phases:

1. The plane fades in, standing still (0.7 s). Meanwhile the place it leaves cools from current
   to yellow.
2. It flies at a constant speed. The length comes from the settings, 30 s by default.
3. It stops and fades out (0.38 s).
4. The new place lights up and pulses.

The camera slerps between quaternions. It eases in over the first 14 % and out over the last
14 % around the plane's constant speed, and rises mid-flight in proportion to distance. The very
first pick with nothing to fly from only turns the camera, eased, over 2–4 s.

### 3.5 Timeline (bottom)

- ▶ / ❚❚ plays or pauses.
- **Press and drag** picks a range, shown in star blue. **A click** picks from the start up to
  that point. **A year** picks the whole year. **A second click on the picked year** opens that
  year in the archive.
- A range that holds no album is refused with a short note.
- A chip shows the range and the album count. Its ✕ or Esc clears the range.
- Yellow on the line is progress: from the start of the range (or of the timeline) up to the
  trip in focus. Picking a new range resets the yellow to nothing until the plane moves again.
- An album's position on the line comes from its month, day and time.

### 3.6 Album panel (left, hidden when nothing is in focus)

- **Above the albums:**
  - the years of this place's albums, the current one underlined; a second click opens the city
    in the archive;
  - in a trip or a year shown on the map, only the trip's name or the year, as a link.
- **Albums:** a stack of cards. The current album shows its photos in turn: each one for the set
  time, 5 s by default, with a 1.4 s dissolve. On hover:
  - the previous and next cards peek out above and below with their date and title;
  - the title appears on the cover;
  - the pictures drift after the cursor;
  - the cycling pauses.
- **Scrolling albums:**
  - the wheel moves one album per notch, and a quick double turn moves two;
  - on a phone, a swipe;
  - the order is by date and loops;
  - in a trip or year view, only that scope's albums of this place.
- **Caption:**
  - date and trip number;
  - the city (a link to the city in the archive);
  - country and album links;
  - "Trip · name" when the album belongs to a trip;
  - flight distance while in flight.
- **Coming home:**
  - the panel shows a cozy animated room: fire, armchair with a blanket, slippers, tea with
    steam, books, moon in the window;
  - under it, "Back home", the home city, then "from City · Album" and "Trip · name" as links
    back into the archive;
  - the trip name stays above the picture.
- **End city:** if a trip ends in another city, that city's photo replaces the room.

### 3.7 Photo window

Opens from an album cover or an archive photo. The photo grows from where it was clicked.

- **Left column:**
  - country, city and album, each a link into the archive;
  - date;
  - the photo's caption;
  - the album's description;
  - credit.
- **Right column:**
  - like toggle with a count;
  - comments list, which the wheel scrolls;
  - comment form.
- **Browsing photos:**
  - ← → buttons and keys;
  - the wheel over the photo, one per notch;
  - a swipe;
  - Slideshow button with its own speed slider (2–15 s), also toggled by Space;
  - an "n / N" counter.
- The next photo slides in from its side.
- Closing flies the photo back into the grid tile now showing it.
- While the window is open, the whole world pauses: globe, plane, sky, cycling, tour.

### 3.8 Header

- **Left: burger.**
  - Logged out: "Log in" and a line about the demo.
  - Logged in: name, the house icon with the home base, "Archive", "Account settings", "Log out".
- **Right: stats** (countries, photos, km flown; in range or so far). The gear holds:
  - photo time on the main screen, 2–15 s;
  - flight time, 5–90 s;
  - a checkbox "Show how to use it" for the help lines shown under the stats.

  These settings are kept per browser.

### 3.9 Keys

Esc closes the innermost layer, in this order:

1. form;
2. menu or settings;
3. photo window;
4. archive (one step back);
5. focus;
6. range.

- ← → move between albums or photos.
- ↑ ↓ scroll albums.
- Space plays or pauses the tour, or the slideshow inside the photo window.

## 4. "Show on map" and tours

"Show on map" exists on albums, years and trips only.

- **Album.**
  - The timeline range becomes that album's moment, in blue.
  - The globe is already turned to the place, and the panel already shows its photos.
  - No autoplay.
- **Year.**
  - The range becomes the whole year, as with a click on the year.
  - The first album of the year is in focus at once.
  - The tour starts by itself and goes through the year's albums in order.
  - It stops at the last album; ▶ plays the year again.
- **Trip.**
  - The range spans the trip. The globe looks at the trip's start, and the panel already shows
    the first place.
  - The plane takes off from the start, visits every album in date order and flies to the end,
    home or a city.
  - Albums in the same city switch without a flight.
- While a year or trip tour is active, the panel is scoped to it (see 3.6). Esc, a click on a
  light outside it, or a new range on the timeline leaves the tour.
- 5 s after a year or trip tour finishes by itself, the archive page it was started from fades
  back in (1.4 s). This does not happen if the owner interrupted the tour, or while the photo
  window or a form is open.

## 5. Archive

A full-screen layer over the globe that pauses the world.

- **Top bar:** ✕ and ← at the left, then tabs: Trips, Albums, Countries, Cities, Years. Below
  them the breadcrumbs, the title, a subtitle and the action buttons.
- **Trips:**
  - cards with cover, name, date span and places; "New trip" first;
  - newest first; an album that belongs to no trip shows as a trip of its own.
- **Trip page:** the route:
  - `00 Start  home · Madrid, Spain` (or a city);
  - each place once, in the order first reached, with its album folders;
  - `NN End  home · Madrid, Spain` (or a city).

  Actions: Show on map, Edit trip, Add album. An album-only trip offers "Make it a trip".
- **Albums:** all albums grouped by year, latest year first; "New album".
- **Countries → Country:** city cards.
- **Cities → City:** albums grouped by year, latest first; "New album here".
- **Years → Year:** that year's album folders; Show on map.
- **Album:** a photo grid. Each tile shows likes, comment count and the caption. Actions: Show on
  map, Edit album, Add photos; each tile has "Edit" on hover.
- **Folders:** a stack of three photos in a folder that fans out on hover.

## 6. Forms

All forms are modal sheets. Destructive buttons ask once more ("Delete it?") before acting.

- **Log in:**
  - name, email, password, home base;
  - home base is a place picker: places on the map first, then a built-in list of about 70
    world cities.
- **Account:** name, email, new password twice (must match), home base, "Reset archive to the
  demo".
- **Trip (new or edit):**
  - name;
  - "Starts from" and "Ends at": home or any city on the map;
  - albums as checkboxes;
  - Delete (albums stay).
- **Album (new or edit):**
  - title;
  - place: a new place becomes a new light, and a new country joins the list;
  - date and time;
  - trip;
  - on create, a photo drop zone;
  - Delete (removes its photos).
- **Photo edit:** preview, caption, Delete.

Photos are resized in the browser to at most 1600 px on the long side, as JPEG at quality 0.86,
before they are stored.

## 7. Data model

```ts
type Id = string;

interface Place { name: string; country: string; countryId: string; lat: number; lon: number }

interface Country { id: Id; name: string; cities: City[] }            // id: ISO 3166 numeric
interface City { key: Id; name: string; lat: number; lon: number; country: Country; albums: Album[] }
interface Album {
  id: Id; title: string; city: City;
  year: number; month: number; day: number; time: string;             // "HH:MM", local
  photoCount: number;                                                  // demo albums claim more than they carry
  photos: PhotoRef[];
}
type PhotoRef =
  | { kind: 'stock'; file: string; caption?: string }                  // bundled demo photo
  | { kind: 'own'; id: Id; name: string; caption?: string };           // blob in IndexedDB
interface Trip { id: Id; name: string; start: Endpoint; end: Endpoint; albumIds: Id[] }
type Endpoint = { home: true } | { cityKey: Id };
interface User { name: string; email: string; home: Place }
interface Social { liked: boolean; likes: number; comments: { who: string; text: string; when: string }[] }
```

- An album belongs to at most one trip.
- Albums sort by year, month, day, time, then title.
- Likes and comments are local stubs keyed by photo until the backend exists.

## 8. Architecture

```
src/
  main.ts                 boot: load data, build UI, start the frame loop
  data/
    types.ts              the model above
    demo.ts               demo countries, albums, trips (from prototype/atlas-data.js)
    places.ts             place picker list and search
    repository.ts         interface: load, save, CRUD for albums, trips, photos, user
    local-repository.ts   localStorage graph + IndexedDB blobs (owner)
    demo-repository.ts    in-memory, read-only (logged out)
    image.ts              resize to JPEG before storing
  geo/
    projection.ts         blend mutator, clip choice, unroll state (pure)
    camera.ts             quaternion helpers, trackball turn, slerp, camera curve (pure)
  timeline/
    range.ts              within, liveRange, reached, progress reset (pure)
  tour/
    tour.ts               tour scope and the next step: album / end / stop (pure)
    flight.ts             flight phases and timings (pure)
  render/
    globe.ts              land, lights, places, route, plane
    house.ts              isometric house shapes, light, smoke
    sky.ts                drift, twinkle, meteors, satellites
  features/
    panel/                album panel, caption, scope header
    timeline/             timeline UI, chip
    archive/              tabs, sections, pages, folders
    lightbox/             photo window, likes, comments, slideshow
    forms/                modal sheet, login, account, trip, album, photo edit, place picker
    header/               burger menu, settings, help lines, stats
  styles/                 existing SCSS setup, new tokens
public/demo/              photos, photos.json (credits), countries-110m.json
```

- One `requestAnimationFrame` loop owns time. It keeps a world clock that stops while the photo
  window or the archive is open. Every animation reads that clock.
- UI features talk through a small app state module (focus, range, tour, mode, settings) with
  change events. There are no framework dependencies.
- The pure modules in `geo/`, `timeline/` and `tour/` hold the logic that went wrong most often
  in the prototype. They are covered by unit tests.
- The repository is the single seam for storage. Section 9 swaps its implementation.
- Settings (pace, help) stay in `localStorage` under their own key.

## 9. Backend (later, not in this build)

`murpiano-server` gets a `cloudpix` project:

- real auth;
- an albums/trips/photos API;
- photo uploads to durable storage (Render's disk is wiped on deploy, so object storage);
- likes and comments per visitor.

`ApiRepository` then implements the same interface. That work gets its own design.

## 10. Testing

- **Unit (Vitest, node):**
  - projection clip choice and fold-free range;
  - quaternion round trips and screen-axis turns;
  - camera curve (continuous, ends at 1);
  - range and progress rules (reset after a new pick, empty range refused);
  - tour next-step logic (same-city switch, end at home or city, year stop);
  - album ordering by date and time;
  - repository CRUD against a fake storage (trip membership moves, delete cascades);
  - image resize size math.
- **Manual check list** before each release:
  - drag over the poles, throw, unroll and roll back at the same notch;
  - a trip tour home with light and smoke;
  - a year tour and the return to the archive;
  - the photo window;
  - creating an album with photos in a new city;
  - reload keeps it;
  - the phone layout at 390 px.
- `npm run check` (typecheck, lint, test) stays green. The README is rewritten for the new app
  when the build lands.

## 11. Out of scope for this build

- The backend, real accounts, sharing with other people.
- Albums spanning several days. An album has one moment.
- Photo effects and the old studio.
- Offline sync between devices.
