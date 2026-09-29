import { describe, expect, it } from 'vitest';
import { byDate, seedOf, slugOf } from './order';

const moment = (year: number, month: number, day: number, time: string, title: string) => ({
  year,
  month,
  day,
  time,
  title,
});

describe('byDate', () => {
  it('orders by year, month, day, time, then title', () => {
    const list = [
      moment(2023, 4, 2, '09:00', 'b'),
      moment(2023, 4, 2, '09:00', 'a'),
      moment(2023, 4, 2, '08:30', 'z'),
      moment(2023, 4, 1, '23:00', 'z'),
      moment(2023, 3, 30, '23:00', 'z'),
      moment(2022, 12, 31, '23:59', 'z'),
    ];
    const sorted = [...list].sort(byDate);
    expect(sorted.map((m) => `${m.year}-${m.month}-${m.day} ${m.time} ${m.title}`)).toEqual([
      '2022-12-31 23:59 z',
      '2023-3-30 23:00 z',
      '2023-4-1 23:00 z',
      '2023-4-2 08:30 z',
      '2023-4-2 09:00 a',
      '2023-4-2 09:00 b',
    ]);
  });
});

describe('slugOf', () => {
  it('drops accents and joins words with dashes', () => {
    expect(slugOf('Reykjavík')).toBe('reykjavik');
    expect(slugOf('Queenstown New Zealand')).toBe('queenstown-new-zealand');
    expect(slugOf('Gaudí & the sea')).toBe('gaudi-the-sea');
    expect(slugOf('Seven hills, one week')).toBe('seven-hills-one-week');
  });
});

describe('seedOf', () => {
  it('is stable', () => {
    expect(seedOf('abc')).toBe(304891);
    expect(seedOf('Tram 28')).toBe(seedOf('Tram 28'));
  });
});
