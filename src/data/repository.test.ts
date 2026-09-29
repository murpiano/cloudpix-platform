import { describe, expect, it } from 'vitest';
import { cleanArchive } from './repository';

const good = {
  countries: [
    {
      id: '250',
      name: 'France',
      cities: [
        {
          key: 'paris',
          name: 'Paris',
          lat: 48.86,
          lon: 2.35,
          albums: [
            {
              id: 'a1',
              title: 'Roofs',
              year: 2022,
              month: 5,
              day: 3,
              time: '10:00',
              photoCount: 2,
              photos: [{ kind: 'own', id: 'p1', name: 'one.jpg', caption: 'Light' }],
            },
          ],
        },
      ],
    },
  ],
  trips: [
    { id: 't1', name: 'Spring', start: { home: true }, end: { cityKey: 'paris' }, albumIds: ['a1'] },
  ],
};

describe('cleanArchive', () => {
  it('keeps a sound archive whole', () => {
    expect(cleanArchive(structuredClone(good))).toEqual(good);
  });

  it('turns anything that is not an archive into nothing', () => {
    expect(cleanArchive(null)).toBeNull();
    expect(cleanArchive('{}')).toBeNull();
    expect(cleanArchive({ trips: [] })).toBeNull();
  });

  it('drops the parts that are broken and keeps the rest', () => {
    const raw = structuredClone(good) as Record<string, unknown>;
    const countries = raw.countries as Record<string, unknown>[];
    countries.push({ id: 7, name: 'Nowhere', cities: [] });
    const city = (countries[0]?.cities as Record<string, unknown>[])[0] as Record<string, unknown>;
    const albums = city.albums as Record<string, unknown>[];
    albums.push({ id: 'a2', title: 'No date' });
    (albums[0] as Record<string, unknown>).photos = [
      { kind: 'own', id: 'p1', name: 'one.jpg', caption: 'Light' },
      { kind: 'stock' },
      { kind: 'ghost', id: 'p2' },
    ];
    (raw.trips as unknown[]).push({ id: 't2' });
    const clean = cleanArchive(raw);
    expect(clean?.countries).toHaveLength(1);
    expect(clean?.countries[0]?.cities[0]?.albums).toHaveLength(1);
    expect(clean?.countries[0]?.cities[0]?.albums[0]?.photos).toHaveLength(1);
    expect(clean?.trips).toHaveLength(1);
  });

  it('never lets a photo count fall below the photos that are there', () => {
    const raw = structuredClone(good);
    const album = raw.countries[0]?.cities[0]?.albums[0];
    if (album) album.photoCount = -3;
    expect(cleanArchive(raw)?.countries[0]?.cities[0]?.albums[0]?.photoCount).toBe(1);
  });
});
