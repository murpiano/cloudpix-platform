import type { PickedPlace } from '@/data/places';
import { pad2 } from '@/lib/math';

export const dateInput = (when: { year: number; month: number; day: number }): string =>
  `${when.year}-${pad2(when.month)}-${pad2(when.day)}`;

/** "YYYY-MM-DD" from a date input, or nothing when the field is empty or impossible. */
export const parseDate = (value: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
};

export const placeLabel = (place: PickedPlace): string => `${place.name}, ${place.country}`;

export const samePlace = (a: PickedPlace | null, b: PickedPlace | null): boolean =>
  a !== null && b !== null && a.name === b.name && a.country === b.country;
