import { useEffect } from 'react';
import type { Archive } from '@/data/archive';
import { appStore } from '@/state/app-state';
import { closePhoto, escapeTarget, stepPhoto, toggleSlideshow } from '@/state/layers';
import type { Director } from '@/tour/director';

/**
 * Esc closes the innermost layer (menu, photo window, then the place in focus, then the range).
 * In the photo window ← → turn the photos and Space runs the slideshow; on the main screen
 * ← → move between albums, ↑ ↓ scroll them and Space plays or pauses the tour.
 */
export const useKeys = (director: Director, archive: Archive): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select')) return;
      const state = appStore.get();

      if (event.key === 'Escape') {
        const layer = escapeTarget(state);
        if (layer === 'menu') appStore.set({ menu: null });
        else if (layer === 'photo') closePhoto(appStore);
        else director.escape();
        return;
      }

      if (state.photo) {
        const count = archive.albumById.get(state.photo.albumId)?.photos.length ?? 0;
        if (event.key === 'ArrowRight') stepPhoto(appStore, count, 1);
        else if (event.key === 'ArrowLeft') stepPhoto(appStore, count, -1);
        else if (event.key === ' ') {
          if (target?.closest('button')) return;
          event.preventDefault();
          toggleSlideshow(appStore);
        }
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
          director.next(1);
          break;
        case 'ArrowLeft':
          director.next(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          director.scroll(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          director.scroll(-1);
          break;
        case ' ':
          // a focused button already takes Space as its own click
          if (target?.closest('button')) return;
          event.preventDefault();
          director.play();
          break;
        default:
          return;
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [director, archive]);
};
