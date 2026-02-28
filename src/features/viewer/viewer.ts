import './viewer.scss';
import { assetUrl } from '@/api/client';
import type { Photo } from '@/api/types';
import { hasFlag, lockScroll, setFlag } from '@/app/flags';
import { isLiked, likeCount, toggleLike } from '@/app/likes';
import { byId, h } from '@/lib/dom';
import { frameLabel, plural } from '@/lib/format';
import { pad2 } from '@/lib/math';
import { flipIn, flipOut } from './flip';
import { listenForSwipes } from './swipe';
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

const META_FADE_MS = 180;

export const createViewer = ({ thumbOf, sourceOf, onFocus }: ViewerOptions): Viewer => {
  const root = byId('viewer');
  const plate = byId('viewerPlate');
  const meta = byId('viewerMeta');
  const layers = [...root.querySelectorAll<HTMLImageElement>('.viewer__layer')];
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
  let front = 0;
  let metaTimer: ReturnType<typeof setTimeout> | undefined;
  let returnFocus: HTMLElement | null = null;

  const current = (): Photo | undefined => sequence[index];

  const renderLikes = (photo: Photo): void => {
    const count = likeCount(photo);
    likes.textContent = String(count);
    like.setAttribute('aria-pressed', String(isLiked(photo.id)));
    like.setAttribute('aria-label', isLiked(photo.id) ? 'Remove like' : 'Like this frame');
    stats.textContent = `${plural(count, 'like')} · ${plural(photo.comments.length, 'comment')}`;
  };

  /**
   * Two stacked layers: the next frame decodes on the hidden one and fades in
   * over the current one, so the picture never blinks or jumps. The decoded
   * thumbnail shows first; the full file replaces it on the same layer.
   */
  const showImage = (photo: Photo, crossfade: boolean): void => {
    const token = ++loadToken;
    const target = (crossfade ? layers[1 - front] : layers[front]) as HTMLImageElement;
    const previous = layers[front] as HTMLImageElement;

    const upgrade = (): void => {
      const full = new Image();
      full.onload = () => {
        if (token === loadToken) {
          target.src = full.src;
        }
      };
      full.src = assetUrl(photo.src);
    };

    const reveal = (): void => {
      if (token !== loadToken) {
        return;
      }
      if (target !== previous) {
        target.classList.add('is-front');
        target.removeAttribute('aria-hidden');
        previous.classList.remove('is-front');
        previous.setAttribute('aria-hidden', 'true');
        front = layers.indexOf(target);
      }
      upgrade();
    };

    target.alt = photo.caption || frameLabel(photo);
    target.src = thumbOf(photo.id) ?? assetUrl(photo.src);
    target.decode().then(reveal, reveal);
  };

  const renderMeta = (photo: Photo): void => {
    title.textContent = frameLabel(photo);
    position.textContent = `${pad2(index + 1)} / ${pad2(sequence.length)}`;
    caption.textContent = photo.caption;
    tags.replaceChildren(...photo.tags.map((tag) => h('li', {}, tag)));
    renderLikes(photo);
    thread.render(photo.comments);
  };

  const render = (photo: Photo): void => {
    clearTimeout(metaTimer);
    meta.classList.remove('is-swapping');
    showImage(photo, false);
    renderMeta(photo);
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
    if (!photo) {
      return;
    }

    showImage(photo, true);
    onFocus(photo.id);
    // Text fades out, changes while invisible, then fades back in.
    meta.classList.add('is-swapping');
    clearTimeout(metaTimer);
    metaTimer = setTimeout(() => {
      renderMeta(photo);
      meta.classList.remove('is-swapping');
    }, META_FADE_MS);
  };

  root.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-close]')) {
      close();
    }
  });

  // Touch and pen: the photo follows the finger, then pages or springs back.
  const shot = plate.querySelector<HTMLElement>('.viewer__shot') as HTMLElement;
  listenForSwipes(shot, {
    onDrag(dx) {
      shot.classList.add('is-dragging');
      const front = layers.find((layer) => layer.classList.contains('is-front'));
      if (front) {
        front.style.transform = `translateX(${dx * 0.35}px)`;
      }
    },
    onRelease(delta) {
      shot.classList.remove('is-dragging');
      layers.forEach((layer) => (layer.style.transform = ''));
      if (delta) {
        step(delta);
      }
    },
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
