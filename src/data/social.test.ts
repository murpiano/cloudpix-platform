import { describe, expect, it } from 'vitest';
import { linkArchive } from './archive';
import { addComment, demoSocial, describeAlbum, photoKey, photoNote, toggleLike } from './social';

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
          albums: [
            {
              id: 'a',
              title: 'Paris again',
              year: 2022,
              month: 4,
              day: 3,
              time: '10:00',
              photoCount: 35,
              photos: [],
            },
          ],
        },
      ],
    },
  ],
  trips: [],
});

describe('demo social', () => {
  it('looks lived in and is the same on every visit', () => {
    const social = demoSocial('w-paris-0.jpg');
    expect(social).toEqual(demoSocial('w-paris-0.jpg'));
    expect(social.liked).toBe(false);
    expect(social.likes).toBeGreaterThanOrEqual(12);
    expect(social.likes).toBeLessThan(242);
    expect(social.comments.length).toBeGreaterThanOrEqual(1);
    expect(social.comments.length).toBeLessThanOrEqual(4);
  });

  it('toggles a like and counts it', () => {
    const social = demoSocial('x');
    const liked = toggleLike(social);
    expect(liked.liked).toBe(true);
    expect(liked.likes).toBe(social.likes + 1);
    expect(toggleLike(liked)).toEqual(social);
  });

  it('adds a comment from you, and ignores a blank one', () => {
    const social = demoSocial('x');
    const next = addComment(social, '  Lovely  ');
    expect(next.comments.at(-1)).toEqual({ who: 'You', text: 'Lovely', when: 'just now' });
    expect(addComment(social, '   ')).toBe(social);
  });
});

describe('texts', () => {
  it('describes an album', () => {
    const album = archive.albums[0];
    if (!album) throw new Error('no album');
    expect(describeAlbum(album)).toMatch(/^35 photos from Paris, Apr 2022\. \S/);
  });

  it('keys photos and prefers the owner caption', () => {
    expect(photoKey({ kind: 'stock', file: 'a.jpg' })).toBe('a.jpg');
    expect(photoKey({ kind: 'own', id: 'u1', name: 'b.jpg' })).toBe('u1');
    expect(photoNote({ kind: 'stock', file: 'a.jpg', caption: 'Mine' })).toBe('Mine');
    expect(photoNote({ kind: 'stock', file: 'a.jpg' }).length).toBeGreaterThan(5);
  });
});
