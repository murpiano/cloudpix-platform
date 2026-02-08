import './chrome.scss';
import { byId } from '@/lib/dom';
import { Icon } from '@/lib/icons';

type IconName = keyof typeof Icon;

const isIconName = (name: string): name is IconName => name in Icon;

/** Fills every `<span data-icon="name">` inside `root` with its SVG. */
export const mountIcons = (root: ParentNode = document): void => {
  for (const slot of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    const name = slot.dataset.icon ?? '';
    if (isIconName(name) && !slot.firstElementChild) {
      slot.innerHTML = Icon[name];
    }
  }
};

interface ChromeOptions {
  onUpload(): void;
  onToggleGrid(): void;
}

export const initChrome = ({ onUpload, onToggleGrid }: ChromeOptions): void => {
  byId('uploadBtn').addEventListener('click', onUpload);
  byId('gridBtn').addEventListener('click', onToggleGrid);
};
