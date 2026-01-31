import './viewer.scss';
import { assetUrl } from '@/api/client';
import type { Photo } from '@/api/types';
import { hasFlag, lockScroll, setFlag } from '@/app/flags';
import { isLiked, likeCount, toggleLike } from '@/app/likes';
import { byId, h } from '@/lib/dom';
import { frameLabel, plural } from '@/lib/format';
import { pad2 } from '@/lib/math';
import { flipIn, flipOut } from './flip';
import { createThread } from './thread';

export interface Viewer {
  open(photoId: number, source: HTMLElement, sequence: Photo[]): void;
  close(): void;
  isOpen(): boolean;
}

interface ViewerOptions {
  thumbOf(photoId: number): string | undefined;
  /** Where the frame lives on screen right now (sphere card or grid tile). */
  sourceOf(photoId: number): HTMLElement | undefined;
  onFocus(photoId: number | null): void;
}

export const createViewer = ({ thumbOf, sourceOf, onFocus }: ViewerOptions): Viewer => {
  const root = byId('viewer');
  const plate = byId('viewerPlate');
  const image = byId<HTMLImageElement>('viewerImg');
  const title = byId('viewerTitle');
  const stats = byId('viewerStats');
  const like = byId<HTMLButtonElement>('viewerLike');
  const likes = byId('viewerLikes');
  const position = byId('viewerPos');
  const caption = byId('viewerCaption');
  const tags = byId('viewerTags');
  const thread = createThread();

  let sequence: Photo[] = [];
  let index = -1;
  let loadToken = 0;
  let returnFocus: HTMLElement | null = null;

  const current = (): Photo | undefined => sequence[index];

  const renderLikes = (photo: Photo): void => {
    const count = likeCount(photo);
    likes.textContent = String(count);
    like.setAttribute('aria-pressed', String(isLiked(photo.id)));
    like.setAttribute('aria-label', isLiked(photo.id) ? 'Remove like' : 'Like this frame');
    stats.textContent = `${plural(count, 'like')} · ${plural(photo.comments.length, 'comment')}`;
  };

  // Show the already decoded thumbnail at once, swap in the full file when it arrives.
  const showImage = (photo: Photo): void => {
    const token = ++loadToken;
    image.src = thumbOf(photo.id) ?? '';
    image.alt = photo.caption || frameLabel(photo);

    const full = new Image();
    full.onload = () => {
      if (token === loadToken) {
        image.src = full.src;
      }
    };
    full.src = assetUrl(photo.src);
  };

  const render = (photo: Photo): void => {
    showImage(photo);
    title.textContent = frameLabel(photo);
    position.textContent = `${pad2(index + 1)} / ${pad2(sequence.length)}`;
    caption.textContent = photo.caption;
    tags.replaceChildren(...photo.tags.map((tag) => h('li', {}, tag)));
    renderLikes(photo);
    thread.render(photo.comments);
  };

  const open = (photoId: number, source: HTMLElement, nextSequence: Photo[]): void => {
    sequence = nextSequence;
    index = sequence.findIndex((photo) => photo.id === photoId);
    const photo = current();
    if (!photo) {
      return;
    }

    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    render(photo);
    root.scrollTop = 0;
    root.inert = false;
    setFlag('lit', true);
    lockScroll(true);
    onFocus(photo.id);
    flipIn(plate, source.getBoundingClientRect());
    // Move focus into the dialog without painting a keyboard ring after a mouse click.
    root
      .querySelector<HTMLElement>('.viewer__close')
      ?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  };

  const close = (): void => {
    const photo = current();
    if (!hasFlag('lit') || !photo) {
      return;
    }

    onFocus(null);
    setFlag('lit', false);
    root.inert = true;
    lockScroll(false);
    flipOut(plate, sourceOf(photo.id)?.getBoundingClientRect());
    returnFocus?.focus({ preventScroll: true });
  };

  const step = (delta: number): void => {
    if (sequence.length < 2) {
      return;
    }

    index = (index + delta + sequence.length) % sequence.length;
    const photo = current();
    if (photo) {
      render(photo);
      onFocus(photo.id);
    }
  };

  root.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-close]')) {
      close();
    }
  });

  byId('viewerPrev').addEventListener('click', () => step(-1));
  byId('viewerNext').addEventListener('click', () => step(1));

  like.addEventListener('click', () => {
    const photo = current();
    if (photo) {
      toggleLike(photo.id);
      renderLikes(photo);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!hasFlag('lit')) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      step(-1);
    } else if (event.key === 'ArrowRight') {
      step(1);
    }
  });

  return { open, close, isOpen: () => hasFlag('lit') };
};
