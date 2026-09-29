import { useSyncExternalStore } from 'react';

/** Matches the `mobile` breakpoint of the SCSS helpers. */
export const MOBILE_QUERY = '(width <= 767px)';

/** Does the media query match now, and does it keep matching as the window changes? */
export const useMedia = (query: string): boolean =>
  useSyncExternalStore(
    (notify) => {
      const list = matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => matchMedia(query).matches,
    () => false,
  );

export const useMobile = (): boolean => useMedia(MOBILE_QUERY);
