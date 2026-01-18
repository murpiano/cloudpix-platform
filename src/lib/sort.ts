import type { Photo } from '@/api/types';

export const SORT_MODES = ['latest', 'liked', 'discussed', 'shuffle'] as const;
export type SortMode = (typeof SORT_MODES)[number];

export const SORT_LABELS: Record<SortMode, string> = {
  latest: 'Latest',
  liked: 'Most liked',
  discussed: 'Most discussed',
  shuffle: 'Shuffle',
};

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }

  return result;
};

/** Returns a new, ordered array; the input is never mutated. */
export const sortPhotos = (
  photos: readonly Photo[],
  mode: SortMode,
  random: () => number = Math.random,
): Photo[] => {
  switch (mode) {
    case 'latest':
      return [...photos].sort((a, b) => b.id - a.id);
    case 'liked':
      return [...photos].sort((a, b) => b.likes - a.likes || b.id - a.id);
    case 'discussed':
      return [...photos].sort((a, b) => b.comments.length - a.comments.length || b.likes - a.likes);
    case 'shuffle':
      return shuffle([...photos], random);
  }
};
