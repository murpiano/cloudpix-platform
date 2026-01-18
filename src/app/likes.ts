import type { Photo } from '@/api/types';
import { readJSON, writeJSON } from '@/lib/storage';

// The backend has no like endpoint, so likes are personal and kept in this browser.
const KEY = 'likes';

const liked = new Set<number>(readJSON<number[]>(KEY, []));
const listeners = new Set<() => void>();

export const isLiked = (photoId: number): boolean => liked.has(photoId);

export const likeCount = (photo: Photo): number => photo.likes + (liked.has(photo.id) ? 1 : 0);

export const toggleLike = (photoId: number): boolean => {
  if (liked.has(photoId)) {
    liked.delete(photoId);
  } else {
    liked.add(photoId);
  }

  writeJSON(KEY, [...liked]);
  listeners.forEach((listener) => listener());
  return liked.has(photoId);
};

export const onLikesChange = (listener: () => void): void => {
  listeners.add(listener);
};
