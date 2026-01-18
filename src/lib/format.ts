import type { Photo } from '@/api/types';
import { pad2 } from './math';

export const frameLabel = (photo: Photo): string => `Frame ${pad2(photo.id + 1)}`;

export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;
