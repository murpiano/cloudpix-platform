import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoContains } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import { earthFromTopology } from '@/geo/world';
import type { WorldTopology } from '@/geo/world';
import { buildLights, lightsFromRows } from './lights';
import type { LightRow } from './lights';

const file = fileURLToPath(new URL('../../public/demo/countries-110m.json', import.meta.url));
const { land } = earthFromTopology(JSON.parse(readFileSync(file, 'utf8')) as WorldTopology);

describe('buildLights', () => {
  const lights = buildLights(land, 200);

  it('puts the asked number of lights on land', () => {
    expect(lights).toHaveLength(200);
    for (const light of lights) expect(geoContains(land, light.ll)).toBe(true);
  });

  it('is the same on every visit', () => {
    expect(buildLights(land, 200)).toEqual(lights);
  });

  it('keeps away from the poles and uses three brightness bands', () => {
    for (const light of lights) {
      expect(Math.abs(light.ll[1])).toBeLessThan(58.3);
      expect([0, 1, 2]).toContain(light.band);
    }
  });
});

describe('the stored lights', () => {
  const rows = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../public/demo/lights.json', import.meta.url)), 'utf8'),
  ) as LightRow[];
  const lights = lightsFromRows(rows);

  it('are the ones buildLights makes, every one on land', () => {
    expect(lights).toHaveLength(1500);
    const first = buildLights(land, 20);
    first.forEach((light, i) => {
      expect(lights[i]?.ll[0]).toBeCloseTo(light.ll[0], 2);
      expect(lights[i]?.ll[1]).toBeCloseTo(light.ll[1], 2);
      expect(lights[i]?.band).toBe(light.band);
    });
    for (const light of lights.slice(0, 60)) expect(geoContains(land, light.ll)).toBe(true);
  });
});
