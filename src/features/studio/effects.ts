export interface Effect {
  id: string;
  label: string;
  /** CSS filter for strength `t` in 0..1; `px` rescales pixel-based filters for bigger canvases. */
  filter: (t: number, px: number) => string;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

export const EFFECTS: readonly Effect[] = [
  { id: 'none', label: 'Original', filter: () => 'none' },
  { id: 'mono', label: 'Mono', filter: (t) => `grayscale(${round(t)})` },
  {
    id: 'noir',
    label: 'Noir',
    filter: (t) =>
      `grayscale(${round(t)}) contrast(${round(1 + 0.6 * t)}) brightness(${round(1 - 0.15 * t)})`,
  },
  {
    id: 'vintage',
    label: 'Vintage',
    filter: (t) =>
      `sepia(${round(0.7 * t)}) saturate(${round(1 + 0.4 * t)}) hue-rotate(${round(-12 * t)}deg)`,
  },
  {
    id: 'glow',
    label: 'Glow',
    filter: (t) =>
      `brightness(${round(1 + 0.3 * t)}) saturate(${round(1 + 0.5 * t)}) contrast(${round(1 - 0.12 * t)})`,
  },
  { id: 'blur', label: 'Soft Blur', filter: (t, px) => `blur(${round(4 * t * px)}px)` },
];

export const DEFAULT_EFFECT = 'none';

/** CSS filter string for an effect id at `strength` 0..100. */
export const effectFilter = (id: string, strength: number, px = 1): string => {
  const effect = EFFECTS.find((item) => item.id === id);
  const t = Math.min(100, Math.max(0, strength)) / 100;
  return effect && t > 0 ? effect.filter(t, px) : 'none';
};
