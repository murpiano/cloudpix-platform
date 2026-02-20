import type { Comment, Photo } from './types';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

const parseComment = (raw: unknown, index: number): Comment | null => {
  if (!isObject(raw)) {
    return null;
  }

  const text = asText(raw.message);
  if (!text) {
    return null;
  }

  return {
    id: typeof raw.id === 'number' ? raw.id : index,
    author: asText(raw.name) || 'Guest',
    text,
  };
};

export const parseTags = (value: unknown): string[] =>
  asText(value)
    .split(/\s+/)
    .filter((tag) => tag.startsWith('#') && tag.length > 1);

const isTagWord = (word: string): boolean => /^#[\p{L}\p{N}_]+$/u.test(word);

/**
 * The server keeps only a description, so the studio appends tags to it.
 * Trailing #words become tags again; the rest is the caption.
 */
export const splitDescription = (value: unknown): { caption: string; tags: string[] } => {
  const words = asText(value).split(/\s+/).filter(Boolean);
  let start = words.length;
  while (start > 0 && isTagWord(words[start - 1] as string)) {
    start -= 1;
  }

  return { caption: words.slice(0, start).join(' '), tags: words.slice(start) };
};

/** Turns one server record into a Photo, or null when the record is unusable. */
export const parsePhoto = (raw: unknown): Photo | null => {
  if (!isObject(raw) || typeof raw.id !== 'number') {
    return null;
  }

  const src = asText(raw.url);
  if (!src) {
    return null;
  }

  const comments = Array.isArray(raw.comments)
    ? raw.comments.map(parseComment).filter((comment) => comment !== null)
    : [];

  const { caption, tags } = splitDescription(raw.description);

  return {
    id: raw.id,
    src,
    likes: asCount(raw.likes),
    comments,
    caption,
    tags: [...new Set([...tags, ...parseTags(raw.hashtags)])],
  };
};

export const parsePhotos = (raw: unknown): Photo[] => {
  if (!Array.isArray(raw)) {
    throw new TypeError('Expected a list of photos');
  }

  return raw.map(parsePhoto).filter((photo) => photo !== null);
};
