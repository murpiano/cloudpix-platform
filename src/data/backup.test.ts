import { describe, expect, it } from 'vitest';
import { makeBackup, readBackup } from './backup';
import type { ArchiveData } from './types';

const archive = (): ArchiveData => ({
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
              photoCount: 3,
              photos: [
                { kind: 'own', id: 'p1', name: 'one.jpg', caption: 'Light' },
                { kind: 'own', id: 'p2', name: 'gone.jpg' },
                { kind: 'stock', file: 'w-paris-0.jpg' },
              ],
            },
          ],
        },
      ],
    },
  ],
  trips: [
    { id: 't1', name: 'Spring', start: { home: true }, end: { home: true }, albumIds: ['a1'] },
  ],
});

const photos = new Map([
  ['p1', new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' })],
]);
const read = (id: string) => Promise.resolve(photos.get(id) ?? null);

describe('backup', () => {
  it('carries the archive and the photo files, and gives them back the same', async () => {
    const file = await makeBackup(archive(), read);
    const back = readBackup(await file.text());
    const album = back?.archive.countries[0]?.cities[0]?.albums[0];
    expect(back?.archive.trips).toEqual(archive().trips);
    expect(album?.title).toBe('Roofs');
    const bytes = new Uint8Array(await (back?.photos.get('p1') as Blob).arrayBuffer());
    expect([...bytes]).toEqual([1, 2, 3, 250]);
    expect(back?.photos.get('p1')?.type).toBe('image/jpeg');
  });

  it('leaves out a photo whose file is gone, with its reference, and keeps the demo photos', async () => {
    const file = await makeBackup(archive(), read);
    const album = readBackup(await file.text())?.archive.countries[0]?.cities[0]?.albums[0];
    expect(album?.photos).toEqual([
      { kind: 'own', id: 'p1', name: 'one.jpg', caption: 'Light' },
      { kind: 'stock', file: 'w-paris-0.jpg' },
    ]);
    expect(album?.photoCount).toBe(2);
  });

  it('does not change the archive it was made from', async () => {
    const data = archive();
    await makeBackup(data, read);
    expect(data).toEqual(archive());
  });

  it('refuses what is not a backup of ours', () => {
    expect(readBackup('not json')).toBeNull();
    expect(readBackup('[]')).toBeNull();
    expect(readBackup(JSON.stringify({ app: 'other', version: 1, archive: archive() }))).toBeNull();
    expect(
      readBackup(JSON.stringify({ app: 'my-world', version: 2, archive: archive() })),
    ).toBeNull();
    expect(readBackup(JSON.stringify({ app: 'my-world', version: 1, archive: 5 }))).toBeNull();
  });

  it('drops the references a damaged file has no photo for', () => {
    const text = JSON.stringify({
      app: 'my-world',
      version: 1,
      archive: archive(),
      photos: { p1: { type: 'image/jpeg', data: 'AQID' }, p2: { type: 5 } },
    });
    const back = readBackup(text);
    const ids = back?.archive.countries[0]?.cities[0]?.albums[0]?.photos.flatMap((photo) =>
      photo.kind === 'own' ? [photo.id] : [],
    );
    expect(ids).toEqual(['p1']);
    expect([...(back?.photos.keys() ?? [])]).toEqual(['p1']);
  });
});
