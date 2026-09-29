import { monthYear } from '@/lib/dates';
import { seedOf } from './order';
import type { Album, PhotoRef } from './types';

export interface Comment {
  who: string;
  text: string;
  when: string;
}

export interface Social {
  liked: boolean;
  likes: number;
  comments: Comment[];
}

const NOTES = [
  'Mostly mornings, before the crowds.',
  'Shot on a phone and an old 35 mm camera.',
  'Three days of rain, then one afternoon of light.',
  'Walked everywhere; the feet still remember.',
  'A short trip that felt long, in the good way.',
  'Friends, late dinners, too many photos of doors.',
];
const PEOPLE = ['Mira', 'Tom', 'Aiko', 'Lucas', 'Nadia', 'Oskar', 'Leila', 'Sam'];
const LINES = [
  'This light!',
  'I want to go back here.',
  'Is this from the same morning?',
  'The colours are unreal.',
  'Adding it to my list.',
  'Remember the rain that day?',
  'Beautiful frame.',
  'Where exactly is this?',
];
const PHOTO_NOTES = [
  'Early light over the rooftops.',
  'The street we kept coming back to.',
  'Nobody else around, for a minute.',
  'Taken on the walk back.',
  'The view from our window.',
  'Waiting for the tram.',
  'Last evening there.',
  'Found this by getting lost.',
];

const pick = (list: readonly string[], n: number): string => list[n % list.length] ?? '';

export const photoKey = (photo: PhotoRef): string =>
  photo.kind === 'stock' ? photo.file : photo.id;

/** Likes and comments are local stubs until the backend exists, seeded per photo. */
export const demoSocial = (key: string): Social => {
  const seed = seedOf(key);
  return {
    liked: false,
    likes: 12 + (seed % 230),
    comments: Array.from({ length: 1 + (seed % 4) }, (_, i) => ({
      who: pick(PEOPLE, seed >>> (i * 3)),
      text: pick(LINES, seed >>> (i * 2 + 1)),
      when: `${1 + ((seed >>> i) % 20)} days ago`,
    })),
  };
};

export const toggleLike = (social: Social): Social => ({
  ...social,
  liked: !social.liked,
  likes: social.likes + (social.liked ? -1 : 1),
});

export const addComment = (social: Social, text: string): Social => {
  const line = text.trim();
  if (!line) return social;
  return { ...social, comments: [...social.comments, { who: 'You', text: line, when: 'just now' }] };
};

/** The album's description: demo text until the owner writes one. */
export const describeAlbum = (album: Album): string =>
  `${album.photoCount} photo${album.photoCount === 1 ? '' : 's'} from ${album.city.name}, ${monthYear(album)}. ${pick(NOTES, seedOf(album.title))}`;

/** The photo's own line: the owner's caption, otherwise a demo line. */
export const photoNote = (photo: PhotoRef): string =>
  photo.caption ?? pick(PHOTO_NOTES, seedOf(photoKey(photo)));
