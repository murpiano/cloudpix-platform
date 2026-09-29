import type { Rect } from '@/state/app-state';

/** The largest box of the given aspect (width / height) that fits in `box`, centred. */
export const fitRect = (box: Rect, aspect: number): Rect => {
  let width = box.width;
  let height = width / aspect;
  if (height > box.height) {
    height = box.height;
    width = height * aspect;
  }
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
};

/** The transform (origin at the top-left) that lays `from` over `to`. */
export const flyTransform = (from: Rect, to: Rect): string =>
  `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${to.width / from.width}, ${to.height / from.height})`;
