import { describe, expect, it } from 'vitest';
import type { Photo } from '@/api/types';
import { sortPhotos } from './sort';

const photo = (id: number, likes: number, comments: number): Photo => ({
  id,
  src: `${id}.jpg`,
  likes,
  caption: '',
  tags: [],
  comments: Array.from({ length: comments }, (_, i) => ({ id: i, author: 'A', text: 'x' })),
});

const photos = [photo(0, 10, 3), photo(1, 50, 1), photo(2, 30, 3), photo(3, 50, 0)];
const ids = (list: Photo[]) => list.map((item) => item.id);

describe('sortPhotos', () => {
  it('orders latest by id, newest first', () => {
    expect(ids(sortPhotos(photos, 'latest'))).toEqual([3, 2, 1, 0]);
  });

  it('orders by likes, ties broken by recency', () => {
    expect(ids(sortPhotos(photos, 'liked'))).toEqual([3, 1, 2, 0]);
  });

  it('orders by comment count, ties broken by likes', () => {
    expect(ids(sortPhotos(photos, 'discussed'))).toEqual([2, 0, 1, 3]);
  });

  it('shuffles every photo exactly once', () => {
    const result = ids(sortPhotos(photos, 'shuffle', () => 0.3));
    expect([...result].sort()).toEqual([0, 1, 2, 3]);
  });

  it('never mutates the input', () => {
    const before = ids(photos);
    sortPhotos(photos, 'liked');
    expect(ids(photos)).toEqual(before);
  });
});
