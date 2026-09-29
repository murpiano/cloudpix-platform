import { geoRotation } from 'd3-geo';
import { photoTotal } from '@/data/archive';
import type { Archive } from '@/data/archive';
import type { City, Place } from '@/data/types';
import { turn, wrapLon } from '@/geo/camera';
import type { Rotation } from '@/geo/camera';
import {
  clipFor,
  createBlendProjection,
  faces,
  flatLatLimit,
  raw,
  ROLLED,
  stepUnroll,
  unrollT,
  WHEEL_ZOOM,
  Z_MAX,
  Z_MIN,
  zFlat,
} from '@/geo/projection';
import type { Unroll } from '@/geo/projection';
import { vec } from '@/geo/vector';
import type { LonLat, Vec3 } from '@/geo/vector';
import type { EarthGeo } from '@/geo/world';
import { ease, pulse } from '@/lib/easing';
import { clamp, DEG } from '@/lib/math';
import { createPainter, placeBase, placeRadius } from '@/render/globe';
import type { PlaceSprite } from '@/render/globe';
import { createSmoke, stepSmoke } from '@/render/house';
import type { Light } from '@/render/lights';
import { PLACE_LOOK, placeState, stepLook } from '@/render/places';
import type { PlaceLook } from '@/render/places';
import { createSky, drawSky, drawStarField, STAR_PAD, starDrift, stepSky } from '@/render/sky';
import { appStore } from '@/state/app-state';
import { placeFacts } from '@/tour/director';
import type { Director } from '@/tour/director';
import { frameStep } from './clock';
import { createGesture } from './gesture';
import type { PointerInput } from './gesture';
import { pushSample, spinDirection, throwVelocity } from './throw';
import type { DragSample } from './throw';

export interface EngineOptions {
  stars: HTMLCanvasElement;
  sky: HTMLCanvasElement;
  globe: HTMLCanvasElement;
  /** The hover label: the engine moves and fades it, React fills it in. */
  label: HTMLElement;
  earth: EarthGeo;
  lights: Light[];
  archive: Archive;
  home: Place;
  director: Director;
}

export interface GlobeEngine {
  destroy(): void;
}

/** Slow spin in degrees per 60 Hz frame. */
const CRUISE = 0.06;
/** Each 60 Hz frame keeps this share of a throw. */
const THROW_DECAY = 0.975;
const PULSE_MS = 1500;
/** A place is hit within this many px of its centre, or more for a big glow. */
const HIT_MIN = 14;

interface PlaceRuntime {
  city: City;
  v: Vec3;
  photos: number;
  look: PlaceLook;
  x: number;
  y: number;
  /** Glow radius, at least `HIT_MIN`. */
  r: number;
  visible: boolean;
}

const context = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  return ctx;
};

const sizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number, dpr: number) => {
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
};

/**
 * The globe. One requestAnimationFrame loop owns time: a world clock that stops while the app
 * state says `paused`, the camera, the input, and all drawing on the three canvases.
 */
export const createEngine = (options: EngineOptions): GlobeEngine => {
  const { stars, globe, label, earth, lights, archive, home, director } = options;
  const g = context(globe);
  const skyCtx = context(options.sky);
  const starsCtx = context(stars);
  const { projection, blend } = createBlendProjection();
  const painter = createPainter(g, projection);

  // viewport
  let width = 0;
  let height = 0;
  let mobile = false;
  let r0 = 1;
  let sky = createSky(1, 1, false);

  // camera: rot turns the globe; z is the zoom, 1 = the planet fits, 0.5 = further out
  let rot: Rotation = [-10, -35, 0];
  let z = 1;
  let zTarget = 1;
  // motion: a throw in degrees per 60 Hz frame about the screen axes, gliding out,
  // and the spin about the Earth's own axis
  let vx = 0;
  let vy = 0;
  let spin = CRUISE;
  let spinning = true;
  let spinDir: 1 | -1 = 1;
  let unroll: Unroll = ROLLED;
  let t = 0;
  let r = 1;
  let cx = 0;
  let cy = 0;
  let centre: Vec3 = [1, 0, 0];
  let lim = 90;

  // clock
  let worldNow = 0;
  let lastFrame: number | null = null;
  let frameId = 0;

  const places: PlaceRuntime[] = archive.cities.map((city) => ({
    city,
    v: vec(city.lon, city.lat),
    photos: photoTotal(city),
    look: { ...PLACE_LOOK.plain },
    x: 0,
    y: 0,
    r: HIT_MIN,
    visible: false,
  }));
  const homeV = vec(home.lon, home.lat);
  let homeLit = 0;
  const smoke = createSmoke();
  let wasFocused = false;

  // input
  const gesture = createGesture();
  let dragging = false;
  let pinchZ = 1;
  let samples: DragSample[] = [];
  let dragX = 0;
  let dragY = 0;
  let mouse: [number, number] | null = null;
  let hovered: PlaceRuntime | null = null;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    mobile = width < 700;
    sizeCanvas(globe, width, height, dpr);
    sizeCanvas(options.sky, width, height, dpr);
    sizeCanvas(stars, width + STAR_PAD * 2, height + STAR_PAD * 2, dpr);
    for (const ctx of [g, skyCtx, starsCtx]) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    r0 = mobile ? Math.min(width * 0.4, height * 0.28) : Math.min(width * 0.3, height * 0.4);
    drawStarField(starsCtx, width + STAR_PAD * 2, height + STAR_PAD * 2);
    sky = createSky(width, height, mobile);
  };

  const measure = (zoom: number) => {
    cx = mobile ? width / 2 : width * 0.6;
    cy = mobile ? height * 0.58 : height * 0.5;
    const zf = zFlat({ width, height, cx, cy, r0 });
    unroll = stepUnroll(unroll, t, zTarget, zf, worldNow);
    t = unrollT(unroll, worldNow);
    r = r0 * (unroll.flat ? Math.max(z, zf) : zoom);
    lim = 90 - t * (90 - flatLatLimit(cy, height, r));
  };

  const project = () => {
    blend(t);
    const view: Rotation = [rot[0], rot[1] * (1 - t), rot[2] * (1 - t)];
    const rotation = geoRotation(view);
    // keep the point the camera looks at in the middle of the frame
    const [lon, lat] = rotation([-rot[0], -rot[1]]);
    const [px, py] = raw(t, lon * DEG, lat * DEG);
    projection
      .preclip(clipFor(t))
      .rotate(view)
      .scale(r)
      .translate([cx - r * px, cy + r * py]);
    const [clon, clat] = rotation.invert([0, 0]);
    centre = vec(clon, clat);
  };

  const placeAt = (x: number, y: number): PlaceRuntime | null => {
    let best: PlaceRuntime | null = null;
    let bestDistance = Infinity;
    for (const place of places) {
      if (!place.visible) continue;
      const distance = Math.hypot(place.x - x, place.y - y);
      if (distance < Math.max(HIT_MIN, place.r * 0.55) && distance < bestDistance) {
        best = place;
        bestDistance = distance;
      }
    }
    return best;
  };

  const updateCursor = () => {
    globe.style.cursor = dragging ? 'grabbing' : hovered ? 'pointer' : '';
  };

  const updateHover = () => {
    // the light under a still cursor changes as the globe turns under it
    if (mouse && !dragging) {
      const next = placeAt(mouse[0], mouse[1]);
      if (next !== hovered) {
        hovered = next;
        updateCursor();
        if (next) appStore.set({ labelCityKey: next.city.key });
      }
    }
    const shown = hovered !== null && hovered.visible;
    label.style.opacity = shown ? '1' : '0';
    if (hovered && shown) {
      label.style.transform = `translate(${hovered.x}px, ${hovered.y - hovered.r * 0.6}px) translate(-50%, -100%)`;
    }
  };

  const draw = (f: number, dt: number) => {
    const view = director.view();
    g.clearRect(0, 0, width, height);
    painter.earth({ width, height, cx, cy, r, t, centre }, earth, lights);

    const base = placeBase(r);
    const sprites: PlaceSprite[] = [];
    for (const place of places) {
      const state = placeState(placeFacts(view, place.city.key));
      place.look = stepLook(place.look, state, f, place === hovered);
      place.visible = faces(place.v, centre, t, 0.02);
      if (!place.visible) continue;
      const point = projection([place.city.lon, place.city.lat]);
      if (!point) {
        place.visible = false;
        continue;
      }
      const sprite: PlaceSprite = {
        x: point[0],
        y: point[1],
        look: place.look,
        pulse: pulse(view.now - (view.pulseAt.get(place.city.key) ?? -Infinity), PULSE_MS),
        photos: place.photos,
      };
      place.x = sprite.x;
      place.y = sprite.y;
      place.r = Math.max(HIT_MIN, placeRadius(sprite, base));
      sprites.push(sprite);
    }
    painter.places(sprites, base);

    // home: lit while someone is there, one pulse on coming home
    homeLit = ease(homeLit, view.homeLit, f, 0.95);
    stepSmoke(smoke, dt, homeLit);
    if (faces(homeV, centre, t, 0.02)) {
      const point = projection([home.lon, home.lat]);
      if (point) {
        const homePulse = pulse(view.now - view.homePulseAt, PULSE_MS);
        const k = clamp(r / 300, 1, 2.2) * 0.5 * (1 + 0.35 * homePulse);
        painter.home({ x: point[0], y: point[1], k, pulse: homePulse, lit: homeLit }, smoke);
      }
    }

    painter.route(view.route);
    if (view.leg) {
      const { path, upto, alpha } = view.leg;
      const points: LonLat[] = [];
      for (let k = 0; k <= upto + 1e-4; k += 0.005) points.push(path(Math.min(k, upto)));
      if (points.length < 2) points.push(path(upto));
      painter.leg(points, alpha, -view.now / 60);
    }
    if (view.plane && faces(vec(view.plane.at[0], view.plane.at[1]), centre, t, 0)) {
      const p = projection(view.plane.at);
      const q0 = projection(view.plane.behind);
      const q1 = projection(view.plane.ahead);
      if (p && q0 && q1) {
        painter.plane(p[0], p[1], Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), view.plane.alpha);
      }
    }

    updateHover();
  };

  const frame = (time: number) => {
    const { dt, f } = frameStep(time, lastFrame, appStore.get().paused);
    lastFrame = time;
    worldNow += dt;

    z = ease(z, zTarget, f, 0.9);
    const drive = director.step(dt, rot, z);
    if (drive.rot) {
      rot = drive.rot;
      vx = vy = 0;
    }
    if (drive.steering) spin = 0;
    // a place in focus stops the spin; letting go of it starts it again
    const focused = director.focused;
    if (focused !== wasFocused) {
      spinning = !focused;
      wasFocused = focused;
    }
    measure(unroll.flat ? z : drive.zoom);
    if (!dragging && !drive.steering) {
      if (vx || vy) {
        rot = turn(rot, vx * f, vy * f, t);
        const keep = THROW_DECAY ** f;
        vx *= keep;
        vy *= keep;
        if (Math.hypot(vx, vy) < 0.003) vx = vy = 0;
      }
      // the Earth keeps turning while it is a ball; the flat map moves only when dragged
      spin = ease(spin, spinning && !unroll.flat ? CRUISE * spinDir : 0, f, 0.985);
      // and the flat map is always level
      const gam = t > 0 ? rot[2] * (1 - 0.08 * t) ** f : rot[2];
      rot = [wrapLon(rot[0] + spin * f), rot[1], gam];
    }
    rot = [rot[0], clamp(rot[1], -lim, lim), rot[2]];
    project();

    stepSky(sky, dt);
    drawSky(skyCtx, sky, worldNow);
    const [driftX, driftY] = starDrift(worldNow);
    stars.style.transform = `translate(${driftX}px, ${driftY}px)`;

    draw(f, dt);
    frameId = requestAnimationFrame(frame);
  };

  // input: drag, throw, wheel and pinch zoom

  const input = (event: PointerEvent): PointerInput => ({
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    mouse: event.pointerType === 'mouse',
    button: event.button,
    buttons: event.buttons,
  });

  const release = (dragged: boolean, x: number, y: number) => {
    dragging = false;
    updateCursor();
    if (!dragged) {
      // a tap on a light picks it
      const place = placeAt(x, y);
      if (place) director.pickCity(place.city.key);
      return;
    }
    [vx, vy] = throwVelocity(samples, performance.now());
    spinDir = spinDirection(vx, vy, rot[2], spinDir);
    // a throw sets the Earth spinning; without one it spins again only if nothing is in focus
    spinning = !director.focused || Math.hypot(vx, vy) > 0.12;
  };

  const onPointerDown = (event: PointerEvent) => {
    const kind = gesture.down(input(event));
    if (kind === 'ignored') return;
    globe.setPointerCapture(event.pointerId);
    dragging = true;
    samples = [];
    dragX = 0;
    dragY = 0;
    updateCursor();
    if (kind === 'pinch') pinchZ = zTarget;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') mouse = [event.clientX, event.clientY];
    const next = gesture.move(input(event));
    if (next.kind === 'release') {
      if (next.dragged) release(true, event.clientX, event.clientY);
      else {
        dragging = false;
        updateCursor();
      }
      return;
    }
    if (next.kind === 'pinch') {
      zTarget = clamp(pinchZ * next.scale, Z_MIN, Z_MAX);
      return;
    }
    if (next.kind !== 'drag') return;

    // a real drag stops any spin
    if (next.started) {
      vx = vy = spin = 0;
      spinning = false;
      director.letGo();
    }
    const perPixel = 1 / DEG / r; // degrees per pixel at the current size
    const dx = next.dx * perPixel;
    const dy = next.dy * perPixel;
    rot = turn(rot, dx, dy, t);
    dragX += dx;
    dragY += dy;
    pushSample(samples, { at: performance.now(), x: dragX, y: dragY });
  };

  const onPointerUp = (event: PointerEvent) => {
    const done = gesture.up(input(event));
    if (done) release(done.dragged, event.clientX, event.clientY);
  };

  const onPointerLeave = () => {
    mouse = null;
    hovered = null;
    updateCursor();
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    zTarget = clamp(zTarget * Math.exp(-event.deltaY * WHEEL_ZOOM), Z_MIN, Z_MAX);
  };

  resize();
  addEventListener('resize', resize);
  globe.addEventListener('pointerdown', onPointerDown);
  globe.addEventListener('pointermove', onPointerMove);
  globe.addEventListener('pointerup', onPointerUp);
  globe.addEventListener('pointercancel', onPointerUp);
  globe.addEventListener('pointerleave', onPointerLeave);
  globe.addEventListener('wheel', onWheel, { passive: false });
  frameId = requestAnimationFrame(frame);

  if (import.meta.env.DEV) {
    Object.assign(window, {
      __globe: {
        state: () => ({ z, zTarget, t, flat: unroll.flat, rot, spin, worldNow }),
        app: () => appStore.get(),
        setZoom: (value: number) => {
          zTarget = clamp(value, Z_MIN, Z_MAX);
        },
      },
    });
  }

  return {
    destroy() {
      cancelAnimationFrame(frameId);
      removeEventListener('resize', resize);
      globe.removeEventListener('pointerdown', onPointerDown);
      globe.removeEventListener('pointermove', onPointerMove);
      globe.removeEventListener('pointerup', onPointerUp);
      globe.removeEventListener('pointercancel', onPointerUp);
      globe.removeEventListener('pointerleave', onPointerLeave);
      globe.removeEventListener('wheel', onWheel);
      label.style.opacity = '0';
      appStore.set({ labelCityKey: null });
      if (import.meta.env.DEV) Reflect.deleteProperty(window, '__globe');
    },
  };
};
