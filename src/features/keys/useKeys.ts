import { useEffect } from 'react';
import type { Director } from '@/tour/director';

/** Esc lets go (place, then range), ← → move between albums, ↑ ↓ scroll them, Space plays. */
export const useKeys = (director: Director): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select')) return;
      switch (event.key) {
        case 'Escape':
          director.escape();
          break;
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
  }, [director]);
};
