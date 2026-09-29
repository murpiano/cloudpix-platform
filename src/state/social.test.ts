import { describe, expect, it } from 'vitest';
import { demoSocial } from '@/data/social';
import { commentPhoto, likePhoto, socialFor } from './social';

describe('social store', () => {
  it('starts every photo from its demo stub and keeps what you do', () => {
    expect(socialFor('p.jpg')).toEqual(demoSocial('p.jpg'));
    likePhoto('p.jpg');
    commentPhoto('p.jpg', 'Wow');
    const social = socialFor('p.jpg');
    expect(social.liked).toBe(true);
    expect(social.comments.at(-1)?.text).toBe('Wow');
    expect(socialFor('q.jpg').liked).toBe(false);
  });
});
