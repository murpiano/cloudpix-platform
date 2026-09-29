import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoContains } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import { earthFromTopology } from './world';
import type { WorldTopology } from './world';

const file = fileURLToPath(new URL('../../public/demo/countries-110m.json', import.meta.url));
const earth = earthFromTopology(JSON.parse(readFileSync(file, 'utf8')) as WorldTopology);

describe('earthFromTopology', () => {
  it('merges the countries into land', () => {
    expect(earth.land.type).toBe('MultiPolygon');
    expect(geoContains(earth.land, [30.52, 50.45])).toBe(true);
    expect(geoContains(earth.land, [-30, 30])).toBe(false);
  });

  it('draws only the borders between countries', () => {
    expect(earth.borders.type).toBe('MultiLineString');
    expect(earth.borders.coordinates.length).toBeGreaterThan(100);
  });
});
