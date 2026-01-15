import { describe, expect, it } from 'vitest';
import { parsePhoto, parsePhotos, parseTags } from './parse';

const record = {
  id: 3,
  url: 'public/cloudpix-platform/default/photos/4.jpg',
  likes: 67,
  comments: [
    { id: 1, avatar: 'a.svg', name: 'Elena', message: 'Lovely light.' },
    { id: 2, avatar: 'b.svg', name: '', message: '  ' },
  ],
};

describe('parsePhoto', () => {
  it('maps a server record and drops empty comments', () => {
    expect(parsePhoto(record)).toEqual({
      id: 3,
      src: 'public/cloudpix-platform/default/photos/4.jpg',
      likes: 67,
      comments: [{ id: 1, author: 'Elena', text: 'Lovely light.' }],
      caption: '',
      tags: [],
    });
  });

  it('reads caption and tags of uploaded frames', () => {
    const photo = parsePhoto({ ...record, description: ' Dusk ', hashtags: '#sea  #calm x' });
    expect(photo?.caption).toBe('Dusk');
    expect(photo?.tags).toEqual(['#sea', '#calm']);
  });

  it('rejects records without id or url', () => {
    expect(parsePhoto({ url: 'x.jpg' })).toBeNull();
    expect(parsePhoto({ id: 1, url: '' })).toBeNull();
    expect(parsePhoto('nope')).toBeNull();
  });

  it('sanitises likes', () => {
    expect(parsePhoto({ ...record, likes: -4 })?.likes).toBe(0);
    expect(parsePhoto({ ...record, likes: '12' })?.likes).toBe(0);
  });
});

describe('parsePhotos', () => {
  it('skips broken records', () => {
    expect(parsePhotos([record, null, { id: 9 }])).toHaveLength(1);
  });

  it('throws on a non-list payload', () => {
    expect(() => parsePhotos({})).toThrow(TypeError);
  });
});

describe('parseTags', () => {
  it('keeps only real hashtags', () => {
    expect(parseTags('#a # b #c')).toEqual(['#a', '#c']);
    expect(parseTags(undefined)).toEqual([]);
  });
});
