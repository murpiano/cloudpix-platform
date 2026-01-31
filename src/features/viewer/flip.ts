const MIN_SCALE = 0.04;
const SETTLE_MS = 640;

const offsetTo = (element: HTMLElement, source: DOMRect): string => {
  const target = element.getBoundingClientRect();
  const dx = source.left + source.width / 2 - (target.left + target.width / 2);
  const dy = source.top + source.height / 2 - (target.top + target.height / 2);
  const scale = Math.max(MIN_SCALE, source.width / target.width);
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
};

let settleTimer: ReturnType<typeof setTimeout> | undefined;

const reset = (element: HTMLElement): void => {
  element.style.transition = 'none';
  element.style.transform = '';
  element.style.opacity = '';
  void element.offsetWidth;
  element.style.transition = '';
};

/** Starts `element` on top of `source` and lets its CSS transition carry it home. */
export const flipIn = (element: HTMLElement, source: DOMRect | undefined): void => {
  clearTimeout(settleTimer);
  reset(element);

  if (!source) {
    return;
  }

  element.style.transition = 'none';
  element.style.transform = offsetTo(element, source);
  element.style.opacity = '0';
  void element.offsetWidth; // commit the start frame before animating
  element.style.transition = '';
  element.style.transform = '';
  element.style.opacity = '';
};

/** Sends `element` back towards `source`, then clears the inline state. */
export const flipOut = (element: HTMLElement, source: DOMRect | undefined): void => {
  clearTimeout(settleTimer);

  if (source) {
    element.style.transform = offsetTo(element, source);
  }
  element.style.opacity = '0';

  settleTimer = setTimeout(() => reset(element), SETTLE_MS);
};
