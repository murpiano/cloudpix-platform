import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { linkArchive } from './archive';
import { buildDemo, DEMO_HOME } from './demo';
import { endpointPlace, tripOfAlbum } from './trips';
import type { Credit } from './types';

const file = fileURLToPath(new URL('../../public/demo/photos.json', import.meta.url));
const archive = linkArchive(buildDemo(JSON.parse(readFileSync(file, 'utf8')) as Credit[]));

describe('tripOfAlbum', () => {
  it('finds the trip an album belongs to', () => {
    expect(tripOfAlbum(archive, 'athens/acropolis-at-sunrise')?.name).toBe('Mediterranean autumn');
    expect(tripOfAlbum(archive, 'nowhere')).toBeUndefined();
  });
});

describe('endpointPlace', () => {
  it('is home for a home endpoint', () => {
    expect(endpointPlace({ home: true }, archive, DEMO_HOME)).toEqual({
      name: 'Saint Petersburg',
      country: 'Russia',
      lon: 30.34,
      lat: 59.93,
      cityKey: null,
    });
  });

  it('is the city for a city endpoint, and home when the city is gone', () => {
    expect(endpointPlace({ cityKey: 'athens' }, archive, DEMO_HOME).name).toBe('Athens');
    expect(endpointPlace({ cityKey: 'atlantis' }, archive, DEMO_HOME).name).toBe('Saint Petersburg');
  });
});
