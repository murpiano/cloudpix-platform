export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

export const DEG = Math.PI / 180;

export const pad2 = (value: number): string => String(value).padStart(2, '0');
