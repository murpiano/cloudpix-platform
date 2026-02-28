export const Swipe = {
  /** A slow drag must travel this far to count. */
  DISTANCE: 60,
  /** A quick flick counts from this distance… */
  FLICK_DISTANCE: 24,
  /** …if it is at least this fast, px/ms. */
  FLICK_SPEED: 0.3,
  /** Horizontal travel must beat vertical travel by this factor. */
  DOMINANCE: 1.4,
} as const;

/**
 * Decides whether a finished gesture was a horizontal swipe.
 * Returns +1 for "next" (finger moved left), -1 for "previous", 0 for neither.
 */
export const swipeStep = (dx: number, dy: number, ms: number): -1 | 0 | 1 => {
  const distance = Math.abs(dx);

  if (distance < Math.abs(dy) * Swipe.DOMINANCE) {
    return 0;
  }

  const speed = distance / Math.max(ms, 1);
  const far = distance >= Swipe.DISTANCE;
  const flick = distance >= Swipe.FLICK_DISTANCE && speed >= Swipe.FLICK_SPEED;

  if (!far && !flick) {
    return 0;
  }

  return dx < 0 ? 1 : -1;
};

interface SwipeHandlers {
  /** Live horizontal offset while the finger is down, for visual feedback. */
  onDrag(dx: number): void;
  /** Gesture finished: +1 next, -1 previous, 0 snap back. */
  onRelease(step: -1 | 0 | 1): void;
}

/**
 * Touch and pen swipes on `element`. Vertical movement stays with the browser
 * (touch-action: pan-y in CSS), so the viewer can still scroll on phones.
 */
export const listenForSwipes = (element: HTMLElement, { onDrag, onRelease }: SwipeHandlers) => {
  let start: { id: number; x: number; y: number; t: number } | null = null;

  element.addEventListener('pointerdown', (event) => {
    const fromControl = event.target instanceof Element && event.target.closest('button');
    if (event.pointerType === 'mouse' || fromControl || start) {
      return;
    }
    start = { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp };
  });

  element.addEventListener('pointermove', (event) => {
    if (start?.id !== event.pointerId) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    onDrag(Math.abs(dx) >= Math.abs(dy) ? dx : 0);
  });

  const finish = (event: PointerEvent, cancelled: boolean): void => {
    if (start?.id !== event.pointerId) {
      return;
    }
    const step = cancelled
      ? 0
      : swipeStep(event.clientX - start.x, event.clientY - start.y, event.timeStamp - start.t);
    start = null;
    onRelease(step);
  };

  element.addEventListener('pointerup', (event) => finish(event, false));
  element.addEventListener('pointercancel', (event) => finish(event, true));
};
