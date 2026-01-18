/**
 * Page-level UI state lives as classes on <body>, so CSS can react to it
 * without components knowing about each other.
 */
export type Flag =
  | 'locked' // splash is up, page cannot scroll
  | 'revealed' // splash is gone, chrome fades in
  | 'deep' // user scrolled into the sphere
  | 'gridview' // flat archive grid is shown
  | 'lit' // a frame is open in the viewer
  | 'menu-open'
  | 'studio-open'
  | 'dropping'; // a file is dragged over the window

export const setFlag = (flag: Flag, on: boolean): void => {
  document.body.classList.toggle(flag, on);
};

export const hasFlag = (flag: Flag): boolean => document.body.classList.contains(flag);

/** Blocks page scroll while an overlay owns the screen. */
export const lockScroll = (locked: boolean): void => {
  document.documentElement.style.overflow = locked ? 'hidden' : '';
};
