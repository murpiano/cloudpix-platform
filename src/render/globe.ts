import { geoPath } from 'd3-geo';
import type { GeoPermissibleObjects, GeoProjection } from 'd3-geo';
import { faces } from '@/geo/projection';
import type { Vec3 } from '@/geo/vector';
import type { EarthGeo } from '@/geo/world';
import { clamp } from '@/lib/math';
import { drawHouse } from './house';
import type { Light } from './lights';
import type { PlaceLook } from './places';

export interface GlobeView {
  width: number;
  height: number;
  cx: number;
  cy: number;
  r: number;
  /** Unroll blend: 0 ball … 1 flat map. */
  t: number;
  /** Unit vector of the point in the middle of the view. */
  centre: Vec3;
}

export interface PlaceSprite {
  x: number;
  y: number;
  look: PlaceLook;
  /** 0..1, see `pulse` in lib/easing. */
  pulse: number;
  photos: number;
}

export interface HomeSprite {
  x: number;
  y: number;
  /** Scale of the house. */
  k: number;
  pulse: number;
  /** 0 dark … 1 someone is home. */
  lit: number;
}

type Rgb = [number, number, number];

const mix = (a: Rgb, b: Rgb, k: number): string =>
  a.map((value, i) => Math.round(value + ((b[i] ?? value) - value) * k)).join(',');

const LIGHT_ALPHA = [0.2, 0.34, 0.5];

/** Size unit for the places: they grow with the globe, within limits. */
export const placeBase = (r: number): number => clamp(r / 380, 0.6, 2);

/** Radius of a place's glow. */
export const placeRadius = ({ photos, look, pulse }: PlaceSprite, base: number): number =>
  (5 + Math.sqrt(photos) * 0.6) * base * look.size * (1 + 0.8 * pulse);

export const createPainter = (ctx: CanvasRenderingContext2D, projection: GeoProjection) => {
  const svg = geoPath(projection).digits(1);
  const shape = (object: GeoPermissibleObjects): Path2D => new Path2D(svg(object) ?? '');

  /** Atmosphere, ocean, land, borders and the faint city lights. */
  const earth = ({ cx, cy, r, t, centre }: GlobeView, geo: EarthGeo, lights: readonly Light[]) => {
    if (t < 1) {
      // the atmosphere fades as the ball unrolls
      const air = ctx.createRadialGradient(cx, cy, r * 0.97, cx, cy, r * 1.14);
      air.addColorStop(0, `rgba(90,140,255,${0.38 * (1 - t)})`);
      air.addColorStop(1, 'rgba(90,140,255,0)');
      ctx.fillStyle = air;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.14, 0, 2 * Math.PI);
      ctx.fill();
    }

    const outline = shape({ type: 'Sphere' });
    const ocean = ctx.createRadialGradient(
      cx - r * 0.3,
      cy - r * 0.4,
      r * 0.1,
      cx,
      cy,
      r * (1.2 + t * 1.6),
    );
    ocean.addColorStop(0, '#10203d');
    ocean.addColorStop(1, '#050913');
    ctx.fillStyle = ocean;
    ctx.fill(outline);
    ctx.strokeStyle = 'rgba(120,160,240,.18)';
    ctx.lineWidth = 1;
    ctx.stroke(outline);

    const land = shape(geo.land);
    ctx.fillStyle = '#17223d';
    ctx.fill(land);
    ctx.strokeStyle = 'rgba(120,150,210,.17)';
    ctx.lineWidth = 0.6;
    ctx.stroke(shape(geo.borders));
    ctx.strokeStyle = 'rgba(150,185,255,.42)';
    ctx.lineWidth = 0.9;
    ctx.stroke(land);

    const size = clamp(r / 330, 0.8, 2.6);
    ctx.globalCompositeOperation = 'lighter';
    LIGHT_ALPHA.forEach((alpha, band) => {
      ctx.beginPath();
      for (const light of lights) {
        if (light.band !== band || !faces(light.v, centre, t, 0.03)) continue;
        const point = projection(light.ll);
        if (point) ctx.rect(point[0], point[1], size, size);
      }
      ctx.fillStyle = `rgba(255,190,110,${alpha})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  };

  /** The places: a glow, then the dot itself (grey, yellow or star blue). */
  const places = (sprites: readonly PlaceSprite[], base: number) => {
    ctx.globalCompositeOperation = 'lighter';
    for (const sprite of sprites) {
      const { x, y, look, pulse } = sprite;
      const glow = Math.max(look.glow, pulse);
      if (glow <= 0.01) continue;
      const radius = placeRadius(sprite, base);
      const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
      halo.addColorStop(
        0,
        `rgba(${mix([255, 226, 160], [205, 225, 255], look.blue)},${0.85 * glow})`,
      );
      halo.addColorStop(
        0.25,
        `rgba(${mix([255, 175, 80], [110, 160, 255], look.blue)},${0.36 * glow})`,
      );
      halo.addColorStop(1, `rgba(${mix([255, 150, 50], [90, 140, 255], look.blue)},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const { x, y, look } of sprites) {
      const tone: Rgb = [
        255 + (190 - 255) * look.blue,
        228 + (215 - 228) * look.blue,
        175 + (255 - 175) * look.blue,
      ];
      const alpha = 0.55 + 0.45 * Math.max(look.glow, look.warm * 0.4);
      ctx.fillStyle = `rgba(${mix([150, 160, 185], tone, look.warm)},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, (1.3 + 1.1 * look.size) * base, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  /** Home: a warm glow and the small house. */
  const home = ({ x, y, k, pulse, lit }: HomeSprite) => {
    const warm = Math.max(pulse, lit * 0.8, 0.15);
    const gy = y - 4 * k;
    const glow = ctx.createRadialGradient(x, gy, 0, x, gy, 22 * k);
    glow.addColorStop(0, `rgba(255,214,150,${0.5 * warm})`);
    glow.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, gy, 22 * k, 0, 2 * Math.PI);
    ctx.fill();
    drawHouse(ctx, x, y, k, lit);
  };

  return { earth, places, home };
};

export type Painter = ReturnType<typeof createPainter>;
