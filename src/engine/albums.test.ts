import { describe, expect, it } from 'vitest';
import { albumsLow } from './albums';

describe('albumsLow', () => {
  it('steps down when the plane flies under the cards, and stays for a plane in the middle', () => {
    expect(albumsLow(false, 200)).toBe(true);
    expect(albumsLow(false, 320)).toBe(false);
    expect(albumsLow(true, 320)).toBe(true);
  });

  it('goes back up once the plane is well below the cards', () => {
    expect(albumsLow(true, 400)).toBe(false);
  });

  it('stays where it is with nothing to follow', () => {
    expect(albumsLow(true, null)).toBe(true);
    expect(albumsLow(false, null)).toBe(false);
  });
});
