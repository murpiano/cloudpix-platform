import type { AlbumData } from './types';

type Moment = Pick<AlbumData, 'year' | 'month' | 'day' | 'time' | 'title'>;

/** Albums sort by year, month, day, time, then title. */
export const byDate = (a: Moment, b: Moment): number =>
  a.year - b.year ||
  a.month - b.month ||
  a.day - b.day ||
  a.time.localeCompare(b.time) ||
  a.title.localeCompare(b.title);

export const slugOf = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-+$/g, '');

/** A stable number from a string: demo albums take their day and time from it. */
export const seedOf = (text: string): number => {
  let hash = 7;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
};
