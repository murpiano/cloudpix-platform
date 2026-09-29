import { linkArchive } from '@/data/archive';
import type { Archive } from '@/data/archive';
import { buildDemo, DEMO_HOME } from '@/data/demo';
import type { Credit, Place } from '@/data/types';
import { earthFromTopology } from '@/geo/world';
import type { EarthGeo, WorldTopology } from '@/geo/world';
import { buildLights } from '@/render/lights';
import type { Light } from '@/render/lights';

export interface World {
  earth: EarthGeo;
  lights: Light[];
  archive: Archive;
  home: Place;
}

export const demoUrl = (path: string): string => `${import.meta.env.BASE_URL}demo/${path}`;

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(demoUrl(path));
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
};

/** Loads the world map and the demo archive. Logged out, the demo traveller is all there is. */
export const loadWorld = async (): Promise<World> => {
  const [topology, credits] = await Promise.all([
    fetchJson<WorldTopology>('countries-110m.json'),
    fetchJson<Credit[]>('photos.json'),
  ]);
  const earth = earthFromTopology(topology);
  return {
    earth,
    lights: buildLights(earth.land),
    archive: linkArchive(buildDemo(credits)),
    home: DEMO_HOME,
  };
};
