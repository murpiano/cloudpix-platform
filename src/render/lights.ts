import { geoContains } from 'd3-geo';
import type { MultiPolygon } from 'geojson';
import { vec } from '@/geo/vector';
import type { Vec3 } from '@/geo/vector';
import { DEG } from '@/lib/math';
import { seeded } from '@/lib/random';

export interface Light {
  ll: [number, number];
  v: Vec3;
  /** 0, 1 or 2: faint, medium, bright. */
  band: number;
}

export const LIGHT_COUNT = 1500;

/** Faint city lights: random points on land, the same on every visit, clear of the poles. */
export const buildLights = (land: MultiPolygon, count = LIGHT_COUNT): Light[] => {
  const random = seeded(11);
  const lights: Light[] = [];
  for (let tries = 0; lights.length < count && tries < 30000; tries++) {
    const lon = random() * 360 - 180;
    const lat = Math.asin(random() * 1.7 - 0.85) / DEG;
    if (geoContains(land, [lon, lat])) {
      lights.push({ ll: [lon, lat], v: vec(lon, lat), band: Math.floor(random() * 3) });
    }
  }
  return lights;
};
