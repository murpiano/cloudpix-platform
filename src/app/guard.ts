const SURFACE = '.photo-surface';

const onSurface = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(SURFACE) !== null;

/**
 * Photos can be opened, not copied: no dragging images out, no text selection
 * starting on them, no "copy / save image" context menu. CSS covers most
 * browsers; these listeners close the gaps (Firefox drag, Safari callouts).
 */
export const guardPhotos = (): void => {
  for (const type of ['dragstart', 'selectstart', 'contextmenu', 'copy'] as const) {
    document.addEventListener(type, (event) => {
      if (onSurface(event.target)) {
        event.preventDefault();
      }
    });
  }
};
