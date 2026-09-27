# CloudPix

A photo archive laid out on a sphere you can grab and spin. TypeScript, SCSS and Vite, no UI
framework and no WebGL.

[Live demo](https://murpiano.github.io/cloudpix-platform/) · [How it works](#how-it-works) · [Run locally](#run-locally)

![CloudPix](docs/screenshot.jpg)

The API sits on a free Render instance that sleeps when nobody uses it, so the first visit can
take up to a minute. The loading screen and the upload form tell you when the server is still
waking up. Uploaded frames are kept in memory and disappear after a restart.

## What you can do

Drag the sphere in any direction and scroll to move closer. Click a frame to open it, then page
with the arrow keys or a swipe. Switch to the grid to sort the archive by date, likes or comment
count, or shuffle it. To add your own frame, pick a photo, try one of five effects, crop it, add
up to six tags and publish. It shows up on the sphere for everyone.

## How it works

### The sphere

Card positions come from a Fibonacci lattice (`features/orbit/layout.ts`), which spreads any
number of points evenly over a sphere. Each card is placed with a CSS 3D transform. Dragging
multiplies into one rotation matrix, the way a trackball works, so the sphere turns over the
poles without the gimbal lock you get from yaw and pitch angles. Near the poles a card can end up
upside down, so `upright.ts` picks its top edge by checking which way moves up on screen after
the perspective projection.

Everything moves in one `requestAnimationFrame` loop: inertia, the scroll dolly and depth
shading. The loop touches the DOM only when a value has actually changed.

### Opening a frame

The viewer uses FLIP. It measures the card or tile you clicked and grows the frame out of that
exact rectangle, then shrinks it back on close. Paging cross-fades between two stacked layers
inside a box of fixed size, so the layout stays still. The decoded thumbnail appears right away
and the full file replaces it once it loads.

### Effects that survive the upload

The Studio previews effects with CSS filters (`features/studio/effects.ts`). A preview that only
lives in CSS would be lost on publish, so `bake.ts` runs the same filter string on a canvas and
exports a JPEG, capped at 2048 px on the long side. The server receives what the author saw.

### One decode per image

Each photo is decoded once and scaled down on a canvas to the size a card needs. The sphere, the
grid and the viewer all share that bitmap.

### Data from the server

Responses go through `src/api/parse.ts` before anything else sees them. Records without an id or
a URL are dropped, and so are empty comments. The server stores only a description, so the Studio
appends tags to it and the parser splits trailing `#words` back into tags. The UI works only with
typed `Photo` objects.

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

Needs Node 20.19 or newer. Every push to `main` runs `npm run check`, builds and deploys to
GitHub Pages (`.github/workflows/deploy.yml`).

## Where things live

```text
src/
├── api/          fetch client, payload parsing, types
├── app/          page state and likes
├── features/
│   ├── orbit/    sphere layout, rotation, camera
│   ├── archive/  grid and sorting
│   ├── viewer/   lightbox, comments, swipe
│   ├── studio/   upload, effects, crop, tags
│   └── splash/  menu/  chrome/  cursor/  toast/
├── lib/          DOM helpers, decoding, storage
└── styles/       tokens and SCSS helpers
```

A feature folder holds its own TypeScript and `.scss`. The pure parts (sphere maths, sorting,
tags, crop planning, filters, swipe detection, parsing) have tests next to them.

## API

Base URL: `https://murpiano-server.onrender.com/cloudpix-platform`

| Method | Path      | Body                                                                                            |
| ------ | --------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/data`   |                                                                                                 |
| POST   | `/upload` | `multipart/form-data`: `filename`, `scale`, `effect`, `effect-level`, `hashtags`, `description` |

## Rough edges

- The backend has no like endpoint. Likes are personal and stored in your browser.
- Comments come from the server and can be read, but there is no way to post one yet.
- Uploads accept JPEG, PNG and WebP up to 15 MB. A published frame can't be deleted.

---

<sub>Bogdan Trotsenko · [@murpiano](https://github.com/murpiano) · [Telegram](https://t.me/murpiano) · MIT</sub>
