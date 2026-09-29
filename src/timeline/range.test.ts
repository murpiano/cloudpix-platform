import { describe, expect, it } from 'vitest';
import {
  albumTime,
  isReached,
  nearestIndex,
  pickedRange,
  rangeLabel,
  span,
  stamp,
  timeAt,
  within,
  yearRange,
} from './range';
import type { Progress } from './range';

const at = (year: number, month: number, day = 1, time = '00:00') =>
  albumTime({ year, month, day, time });

describe('albumTime', () => {
  it('places an album by its month, day and time', () => {
    expect(at(2020, 1)).toBe(2020);
    expect(at(2020, 7)).toBeCloseTo(2020.5);
    expect(at(2020, 7, 2)).toBeGreaterThan(at(2020, 7, 1, '23:59'));
    expect(at(2020, 7, 1, '12:00')).toBeGreaterThan(at(2020, 7, 1, '11:59'));
    expect(at(2020, 12, 31, '23:59')).toBeLessThan(2021);
  });
});

describe('ranges', () => {
  it('holds the times inside it, both ends included', () => {
    const range = { lo: 2019, hi: 2020 };
    expect(within(2019, range)).toBe(true);
    expect(within(2020, range)).toBe(true);
    expect(within(2020.01, range)).toBe(false);
    expect(within(1990, null)).toBe(true);
  });

  it('makes a whole year', () => {
    const year = yearRange(2023);
    expect(year.year).toBe(2023);
    expect(within(at(2023, 12, 31, '23:59'), year)).toBe(true);
    expect(within(2024, year)).toBe(false);
  });

  it('picks a dragged stretch in either direction, and a click from the start', () => {
    expect(pickedRange(2021, 2019, true, 2016)).toEqual({ lo: 2019, hi: 2021 });
    expect(pickedRange(2021, 2021.2, false, 2016)).toEqual({ lo: 2016, hi: 2021.2 });
  });

  it('spans whole years around the albums', () => {
    expect(span([2016.5, 2025.8, 2019.1])).toEqual([2016, 2026]);
  });
});

describe('timeAt', () => {
  const times = [2016.5, 2019.25];
  const bounds: [number, number] = [2016, 2020];

  it('snaps to an album within 10 px', () => {
    // 2019.25 sits at 325 px on a 400 px track
    expect(timeAt(330, 400, times, bounds)).toBe(2019.25);
  });

  it('reads the time under the cursor elsewhere', () => {
    expect(timeAt(200, 400, times, bounds)).toBe(2018);
    expect(timeAt(-50, 400, times, bounds)).toBe(2016);
  });

  it('finds the nearest album', () => {
    expect(nearestIndex(2018.9, times)).toBe(1);
    expect(nearestIndex(2010, times)).toBe(0);
  });
});

describe('isReached', () => {
  const progress = (patch: Partial<Progress>): Progress => ({
    on: true,
    focus: 3,
    ahead: false,
    range: null,
    ...patch,
  });

  it('reaches every album up to the one in focus', () => {
    expect(isReached(3, 2020, progress({}))).toBe(true);
    expect(isReached(4, 2021, progress({}))).toBe(false);
  });

  it('does not count the album the plane is still flying to', () => {
    expect(isReached(3, 2020, progress({ ahead: true }))).toBe(false);
    expect(isReached(2, 2019, progress({ ahead: true }))).toBe(true);
  });

  it('starts at the picked range', () => {
    expect(isReached(1, 2017, progress({ range: { lo: 2018, hi: 2022 } }))).toBe(false);
    expect(isReached(2, 2019, progress({ range: { lo: 2018, hi: 2022 } }))).toBe(true);
  });

  it('shows nothing after a new pick until the plane moves again, or with no focus', () => {
    expect(isReached(1, 2017, progress({ on: false }))).toBe(false);
    expect(isReached(0, 2016, progress({ focus: -1 }))).toBe(false);
  });
});

describe('labels', () => {
  it('names a moment, a stretch and a year', () => {
    expect(stamp(at(2023, 4, 10))).toBe('Apr 2023');
    expect(rangeLabel({ lo: at(2019, 3), hi: at(2021, 10) })).toBe('Mar 2019 – Oct 2021');
    expect(rangeLabel({ lo: at(2019, 3), hi: at(2019, 3) })).toBe('Mar 2019');
    expect(rangeLabel(yearRange(2023))).toBe('2023');
  });
});
