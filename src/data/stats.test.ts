import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { albumTime, yearRange } from '@/timeline/range';
import { linkArchive } from './archive';
import { buildDemo } from './demo';
import { journeyStats } from './stats';
import type { Credit } from './types';

const file = fileURLToPath(new URL('../../public/demo/photos.json', import.meta.url));
const archive = linkArchive(buildDemo(JSON.parse(readFileSync(file, 'utf8')) as Credit[]));
const times = archive.albums.map(albumTime);
const allPhotos = archive.albums.reduce((sum, a) => sum + a.photoCount, 0);

describe('journeyStats', () => {
  it('counts everything with nothing picked', () => {
    const stats = journeyStats(archive, times, null, -1);
    expect(stats.scope).toBe('all');
    expect(stats.countries).toBe(12);
    expect(stats.totalCountries).toBe(12);
    expect(stats.photos).toBe(allPhotos);
    expect(stats.km).toBeGreaterThan(50000);
  });

  it('counts what is in the range', () => {
    const stats = journeyStats(archive, times, yearRange(2023), 5);
    expect(stats.scope).toBe('range');
    expect(stats.countries).toBe(2);
  });

  it('counts so far, up to the album in focus', () => {
    const stats = journeyStats(archive, times, null, 0);
    expect(stats.scope).toBe('so far');
    expect(stats.countries).toBe(1);
    expect(stats.km).toBe(0);
    expect(stats.photos).toBe(archive.albums[0]?.photoCount);
  });
});
