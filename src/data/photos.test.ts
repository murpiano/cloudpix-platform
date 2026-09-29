import { describe, expect, it } from 'vitest';
import { linkArchive } from './archive';
import { forgetOwnUrls, rememberOwnUrl } from './blobs';
import { cityPhotos, creditLine, photoUrl } from './photos';
import type { AlbumData, Credit } from './types';

const album = (id: string, files: string[]): AlbumData => ({
  id,
  title: id,
  year: 2020,
  month: 1,
  day: 1,
  time: '12:00',
  photoCount: files.length,
  photos: files.map((file) => ({ kind: 'stock', file })),
});

const archive = linkArchive({
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
          albums: [album('a', ['p0.jpg', 'p1.jpg']), album('b', ['p1.jpg', 'p2.jpg'])],
        },
      ],
    },
  ],
  trips: [],
});
const paris = archive.cityByKey.get('paris');
const credits = new Map<string, Credit>([
  ['p0.jpg', { city: 'Paris', file: 'p0.jpg', author: 'Ann', lic: 'CC BY 4.0' }],
]);

describe('photoUrl', () => {
  it('finds a stock photo under the demo folder', () => {
    expect(photoUrl({ kind: 'stock', file: 'p0.jpg' })).toBe(
      `${import.meta.env.BASE_URL}demo/photos/p0.jpg`,
    );
  });

  it('has no url for an own photo yet', () => {
    expect(photoUrl({ kind: 'own', id: 'x', name: 'x.jpg' })).toBeNull();
  });
});

describe('creditLine', () => {
  it('credits the author and the license', () => {
    if (!paris) throw new Error('no paris');
    expect(creditLine({ kind: 'stock', file: 'p0.jpg' }, paris, credits)).toBe(
      'Paris · photo: Ann · CC BY 4.0 · Wikimedia Commons',
    );
    expect(creditLine({ kind: 'own', id: 'x', name: 'x.jpg' }, paris, credits)).toBe(
      'Paris · your photo',
    );
  });
});

describe('cityPhotos', () => {
  it('lists each photo of a city once', () => {
    if (!paris) throw new Error('no paris');
    expect(cityPhotos(paris).map((p) => (p.kind === 'stock' ? p.file : ''))).toEqual([
      'p0.jpg',
      'p1.jpg',
      'p2.jpg',
    ]);
  });
});

describe('photoUrl for the owner', () => {
  it('gives back the url the blob was registered under', () => {
    forgetOwnUrls();
    rememberOwnUrl('p1', 'blob:fake');
    expect(photoUrl({ kind: 'own', id: 'p1', name: 'one.jpg' })).toBe('blob:fake');
  });

  it('gives back nothing when the blob is gone, so the tile stays blank', () => {
    forgetOwnUrls();
    expect(photoUrl({ kind: 'own', id: 'p1', name: 'one.jpg' })).toBeNull();
  });
});
