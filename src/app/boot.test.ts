import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoUrl, loadWorld } from './boot';

const demoDir = fileURLToPath(new URL('../../public/demo/', import.meta.url));

const serve = (status: number) =>
  vi.fn(async (url: string) => {
    const file = url.split('/demo/')[1] ?? '';
    return {
      ok: status === 200,
      status,
      json: async () => JSON.parse(readFileSync(`${demoDir}${file}`, 'utf8')) as unknown,
    };
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('demoUrl', () => {
  it('builds on the base path, so it works under /my-world/ too', () => {
    expect(demoUrl('photos.json')).toBe(`${import.meta.env.BASE_URL}demo/photos.json`);
  });
});

describe('loadWorld', () => {
  it('loads the map and the demo traveller', async () => {
    const fetch = serve(200);
    vi.stubGlobal('fetch', fetch);
    const world = await loadWorld();
    expect(fetch).toHaveBeenCalledWith(demoUrl('countries-110m.json'));
    expect(fetch).toHaveBeenCalledWith(demoUrl('photos.json'));
    expect(world.archive.cities).toHaveLength(8);
    expect(world.home.name).toBe('Saint Petersburg');
    expect(world.lights.length).toBeGreaterThan(1000);
    expect(world.credits.get('w-athens-0.jpg')?.city).toBe('Athens');
  });

  it('fails loudly when a file is missing', async () => {
    vi.stubGlobal('fetch', serve(404));
    await expect(loadWorld()).rejects.toThrow(/HTTP 404/);
  });
});
