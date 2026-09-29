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
import type { Vec3 } from '@/geo/vector';
import type { EarthGeo } from '@/geo/world';
import { ease, pulse } from '@/lib/easing';
import { clamp, DEG } from '@/lib/math';
import { createPainter, placeBase, placeRadius } from '@/render/globe';
import type { PlaceSprite } from '@/render/globe';
import type { Light } from '@/render/lights';
import { PLACE_LOOK, stepLook } from '@/render/places';
import type { PlaceLook } from '@/render/places';
import { createSky, drawSky, drawStarField, STAR_PAD, starDrift, stepSky } from '@/render/sky';
import { appStore } from '@/state/app-state';
import { frameStep } from './clock';
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
}

export interface GlobeEngine {
  destroy(): void;
}

/** Slow spin in degrees per 60 Hz frame. */
const CRUISE = 0.06;
/** Each 60 Hz frame keeps this share of a throw. */
const THROW_DECAY = 0.975;
const PULSE_MS = 1500;
/** A press becomes a drag after this many px. */
const DRAG_THRESHOLD = 5;
/** A place is hit within this many px of its centre, or more for a big glow. */
const HIT_MIN = 14;

interface PlaceRuntime {
  city: City;
  v: Vec3;
  photos: number;
  look: PlaceLook;
  pulseAt: number;
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
  const { stars, globe, label, earth, lights, archive, home } = options;
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
    pulseAt: -Infinity,
    x: 0,
    y: 0,
    r: HIT_MIN,
    visible: false,
  }));
  const homeV = vec(home.lon, home.lat);

  // input
  const pointers = new Map<number, [number, number]>();
  let dragging = false;
  let moved = false;
  let pinch: { distance: number; z: number } | null = null;
  let downAt: [number, number] = [0, 0];
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

  const measure = () => {
    cx = mobile ? width / 2 : width * 0.6;
    cy = mobile ? height * 0.58 : height * 0.5;
    const zf = zFlat({ width, height, cx, cy, r0 });
    unroll = stepUnroll(unroll, t, zTarget, zf, worldNow);
    t = unrollT(unroll, worldNow);
    r = r0 * (unroll.flat ? Math.max(z, zf) : z);
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

  const draw = (f: number) => {
    g.clearRect(0, 0, width, height);
    painter.earth({ width, height, cx, cy, r, t, centre }, earth, lights);

    const base = placeBase(r);
    const sprites: PlaceSprite[] = [];
    for (const place of places) {
      place.look = stepLook(place.look, 'plain', f, place === hovered);
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
        pulse: pulse(worldNow - place.pulseAt, PULSE_MS),
        photos: place.photos,
      };
      place.x = sprite.x;
      place.y = sprite.y;
      place.r = Math.max(HIT_MIN, placeRadius(sprite, base));
      sprites.push(sprite);
    }
    painter.places(sprites, base);

    if (faces(homeV, centre, t, 0.02)) {
      const point = projection([home.lon, home.lat]);
      if (point) {
        painter.home({
          x: point[0],
          y: point[1],
          k: clamp(r / 300, 1, 2.2) * 0.5,
          pulse: 0,
          lit: 0,
        });
      }
    }

    updateHover();
  };

  const frame = (time: number) => {
    const { dt, f } = frameStep(time, lastFrame, appStore.get().paused);
    lastFrame = time;
    worldNow += dt;

    z = ease(z, zTarget, f, 0.9);
    measure();
    if (!dragging) {
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

    draw(f);
    frameId = requestAnimationFrame(frame);
  };

  // input: drag, throw, wheel and pinch zoom

  const onPointerDown = (event: PointerEvent) => {
    globe.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    downAt = [event.clientX, event.clientY];
    dragging = true;
    moved = false;
    samples = [];
    dragX = 0;
    dragY = 0;
    updateCursor();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (a && b) pinch = { distance: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zTarget };
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') mouse = [event.clientX, event.clientY];
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);

    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (a && b) {
        const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
        zTarget = clamp((pinch.z * distance) / pinch.distance, Z_MIN, Z_MAX);
      }
      return;
    }

    // a real drag starts after a few px, and it stops any spin
    if (
      !moved &&
      Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]) > DRAG_THRESHOLD
    ) {
      moved = true;
      vx = vy = spin = 0;
      spinning = false;
    }
    if (!moved) return;

    const perPixel = 1 / DEG / r; // degrees per pixel at the current size
    const dx = (event.clientX - previous[0]) * perPixel;
    const dy = (event.clientY - previous[1]) * perPixel;
    rot = turn(rot, dx, dy, t);
    dragX += dx;
    dragY += dy;
    pushSample(samples, { at: performance.now(), x: dragX, y: dragY });
  };

  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size > 0) return;
    dragging = false;
    updateCursor();
    if (!moved) return;
    [vx, vy] = throwVelocity(samples, performance.now());
    spinDir = spinDirection(vx, vy, rot[2], spinDir);
    // let go, with or without a throw: the Earth picks its spin back up
    spinning = true;
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
