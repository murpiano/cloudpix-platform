import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoContains } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import { earthFromTopology } from '@/geo/world';
import type { WorldTopology } from '@/geo/world';
import { buildLights } from './lights';

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
