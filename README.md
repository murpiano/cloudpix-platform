# CloudPix

A personal travel archive on a night globe. Every place you have been is a light; click one and
the plane flies there, the album opens, and the photos from that day come up one by one.
React, TypeScript and SCSS on a 2D canvas — no WebGL, no map tiles, no server.

[Live demo](https://murpiano.github.io/cloudpix-platform/) · [How it works](#how-it-works) · [Run locally](#run-locally)

## Two modes

**Demo (logged out).** A sample traveller: 12 countries, 22 cities, 32 albums, 23 trips, stock
photos from Wikimedia Commons with their credits. Home is Kyiv. The globe, the timeline, the
tours, the album panel and the photo window all work. Nothing is saved.

**Owner (logged in).** Your own archive. On the first login it starts as a copy of the demo, so
there is something to walk through, and every change after that is kept in your browser. Logging
out shows the untouched demo again; "Reset archive to the demo" in the account settings starts
over. Login is local: a name, an email, a password that is never stored, and a home base.

## What you can do

Drag the globe and let go to spin it; scroll to move closer. Zoomed out far enough, the sphere
unrolls into a flat map and rolls back up when you return. Click a light and the plane flies from
your home base to that city, the album panel opens on the left and the photos pass by.

The timeline at the bottom is the years of your travels. Click a point to see everything up to
it, drag to pick a range, click a year to pick that year and click it again to open it in the
archive. Press play and the whole range plays as a tour, flight by flight.

Click a photo and it grows out of its card into the photo window: arrow keys or a swipe to turn
the pages, Space for a slideshow, a heart and a comment box under it. Esc closes whatever is
innermost — a form, a menu, the photo, one step of the archive, then the place in focus.

The archive lists the same collection five ways: trips, albums, countries, cities and years. Each
page has "Show on map", which closes the archive and shows that year or trip on the globe; when
the tour ends by itself, the archive fades back in where you left it.

Logged in, the archive also edits: a trip (a name, where it starts and ends, which albums belong
to it), an album (a title, a place, a day, a trip, and photos dropped straight in), and a photo
(its caption, or away with it). A place that is not on the map yet becomes a new light, and a new
country joins the list.

## How it works

### One clock, two worlds

A single `requestAnimationFrame` loop owns time (`src/engine/`). It keeps a **world clock** that
stops while a form, the photo window or the archive is open, and every animation reads it — the
plane, the smoke over the house, the twinkling sky, the slideshow. React never renders per frame:
the canvas engine and the components share a tiny store (`src/state/store.ts`, read through
`useSyncExternalStore`), and the engine writes to it only when something actually changes, such
as the city under the cursor or a landing.

### The globe that unrolls

`src/geo/projection.ts` blends an orthographic globe into an equirectangular map as you zoom out,
and clips the land the right way in both, plus everywhere in between. Rotation is a trackball:
drags multiply into quaternions (`src/geo/camera.ts`), so the globe turns the way you push it,
with no gimbal lock at the poles. A throw keeps spinning from the last pointer samples and eases
back to a stop.

### The director

The journey has a brain, and it is pure (`src/tour/director.ts`): what is in focus, which flight
is under way, where the camera should look, how long to wait at a place, and what comes next in
a tour. The engine calls `step(dt, rotation, zoom)` each frame and draws what `view()` returns.
That split is what makes the hard parts testable — flight phases, tour scope, the timeline range
and the projection each have their own unit tests.

### Storage behind one seam

`Repository` (`src/data/repository.ts`) is the only way anything is stored. `demo-repository` is
read-only and built from the bundled demo; `local-repository` keeps the graph in `localStorage`
and the photo files in IndexedDB. Photos are resized in the browser to at most 1600 px on the
long side, JPEG at quality 0.86, before they are kept. Whatever comes back out of storage goes
through `cleanArchive` first, so a half-written or hand-edited entry cannot break the page. When
a backend arrives, it implements the same interface and nothing above it changes.

### Edits without a rebuild

An edit runs as a pure function on the stored graph (`src/data/edits.ts`), then `relinkInto`
rebuilds the linked archive **inside the same object** — the director and the engine hold that
object and read it every frame, so they never see a stale one. A revision counter in a store
tells React to render again.

## Run locally

```bash
git clone https://github.com/murpiano/cloudpix-platform.git
cd cloudpix-platform
npm install

npm run dev       # dev server, prints the local URL
npm run check     # tsc, eslint and vitest
npm run build     # type-check and build into dist/
npm run preview   # serve the build
```

Needs Node 22.12 or newer. Every push to `main` runs `npm run check`, builds and deploys to
GitHub Pages (`.github/workflows/deploy.yml`).

## Where things live

```text
src/
├── app/         boots the world, lays out the screen
├── state/       the store, the app state, layers, settings, session
├── engine/      the frame loop, gestures, inertia
├── geo/         projection, camera, the world map
├── render/      land, lights, the house, the sky, routes and the plane
├── tour/        the director, flights, tour scope
├── timeline/    ranges and the progress along them
├── archive/     the archive pages model
├── data/        types, the demo, the repository, edits, photos
├── features/    one folder per feature, each with its SCSS
│   ├── globe/ panel/ timeline/ lightbox/ archive/ forms/ header/ keys/
└── styles/      tokens and SCSS helpers
```

Every pure module has its tests next to it; there are 270 of them.

## Not there yet

There is no server. Likes and comments are local stubs, the password is not stored or checked,
and an owner's archive lives in one browser only — clear the site data and it is gone. A real
API, real auth and durable photo storage are the next piece of work.

---

<sub>[Bogdan Trotsenko](https://github.com/murpiano) · [murpiano](https://github.com/murpiano) · [Telegram](https://t.me/murpiano) · [MIT](LICENSE)</sub>
