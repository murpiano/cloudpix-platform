import './menu.scss';
import { hasFlag, setFlag } from '@/app/flags';
import { byId } from '@/lib/dom';

export interface Menu {
  isOpen(): boolean;
  close(): void;
}

interface MenuOptions {
  onArchive(): void;
  onUpload(): void;
}

export const createMenu = ({ onArchive, onUpload }: MenuOptions): Menu => {
  const panel = byId('menu');
  const button = byId<HTMLButtonElement>('menuBtn');

  const toggle = (open: boolean): void => {
    setFlag('menu-open', open);
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

    if (open) {
      panel.querySelector('a')?.focus({ preventScroll: true });
    }
  };

  button.addEventListener('click', () => toggle(!hasFlag('menu-open')));

  panel.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link) {
      return;
    }

    const action = link.dataset.action;
    toggle(false);

    if (action) {
      event.preventDefault();
      if (action === 'archive') {
        onArchive();
      } else if (action === 'upload') {
        onUpload();
      }
    }
  });

  return {
    isOpen: () => hasFlag('menu-open'),
    close: () => toggle(false),
  };
};
