import { useEffect } from 'react';
import { RETURN_DELAY_MS, SLOW_FADE_MS, tourOutcome } from '@/archive/return';
import { appStore } from '@/state/app-state';
import { openArchive } from '@/state/archive-nav';
import { forgetReturn, takeReturn } from './links';

/**
 * 5 s after a year or trip tour ends by itself, the archive page it was started from fades back
 * in; not if the owner interrupted the tour, or while the photo window is open.
 */
export const useArchiveReturn = (): void => {
  useEffect(() => {
    let prev = appStore.get();
    let timer = 0;
    let fade = 0;
    const unsubscribe = appStore.subscribe(() => {
      const next = appStore.get();
      const outcome = tourOutcome(prev, next);
      prev = next;
      if (outcome === 'interrupted') {
        forgetReturn();
        clearTimeout(timer);
      }
      if (outcome !== 'finished') return;
      const pages = takeReturn();
      if (!pages || pages.length === 0) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        const state = appStore.get();
        if (state.photo || state.archive) return;
        const [first, ...rest] = pages;
        if (!first) return;
        openArchive(appStore, first, true, true);
        for (const page of rest) openArchive(appStore, page, false, true);
        fade = window.setTimeout(() => {
          const archive = appStore.get().archive;
          if (archive?.slow) appStore.set({ archive: { ...archive, slow: false } });
        }, SLOW_FADE_MS);
      }, RETURN_DELAY_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
      clearTimeout(fade);
    };
  }, []);
};
