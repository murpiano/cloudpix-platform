import './archive.scss';
import type { Photo } from '@/api/types';
import { hasFlag, setFlag } from '@/app/flags';
import { likeCount, onLikesChange } from '@/app/likes';
import { byId, fromHTML, h } from '@/lib/dom';
import { frameLabel, plural } from '@/lib/format';
import { Icon } from '@/lib/icons';
import { SORT_LABELS, SORT_MODES, sortPhotos } from '@/lib/sort';
import type { SortMode } from '@/lib/sort';
import { readJSON, writeJSON } from '@/lib/storage';

export interface Archive {
  setPhotos(photos: Photo[], thumbs: ReadonlyMap<number, string>): void;
  toggle(open?: boolean): void;
  isOpen(): boolean;
  tileOf(photoId: number): HTMLElement | undefined;
  /** Photos in the order the grid currently shows them. */
  order(): Photo[];
}

interface ArchiveOptions {
  onOpen(photoId: number, tile: HTMLElement): void;
  onToggle(open: boolean): void;
}

const SORT_KEY = 'sort';

const isSortMode = (value: unknown): value is SortMode => SORT_MODES.includes(value as SortMode);

const withTransition = (update: () => void): void => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduce && hasFlag('gridview')) {
    document.startViewTransition(update);
  } else {
    update();
  }
};

export const createArchive = ({ onOpen, onToggle }: ArchiveOptions): Archive => {
  const root = byId('archive');
  const rows = byId('archiveRows');
  const count = byId('archiveCount');
  const sortBar = byId('archiveSort');
  const gridButton = byId('gridBtn');

  const stored = readJSON<unknown>(SORT_KEY, 'latest');
  let mode: SortMode = isSortMode(stored) ? stored : 'latest';
  let photos: Photo[] = [];
  let ordered: Photo[] = [];
  let thumbs: ReadonlyMap<number, string> = new Map();
  const tiles = new Map<number, HTMLElement>();

  const sortButtons = SORT_MODES.map((value) => {
    const button = h(
      'button',
      { type: 'button', class: 'sort-chip', role: 'radio', 'aria-checked': String(value === mode) },
      SORT_LABELS[value],
    );
    button.addEventListener('click', () => setMode(value));
    return button;
  });
  sortBar.append(...sortButtons);

  const stats = (photo: Photo): HTMLElement =>
    h(
      'span',
      { class: 'tile__stats' },
      h(
        'span',
        { 'aria-label': plural(likeCount(photo), 'like') },
        fromHTML(Icon.heart),
        String(likeCount(photo)),
      ),
      h(
        'span',
        { 'aria-label': plural(photo.comments.length, 'comment') },
        fromHTML(Icon.comment),
        String(photo.comments.length),
      ),
    );

  const createTile = (photo: Photo): HTMLElement => {
    const label = frameLabel(photo);
    const tile = h(
      'figure',
      { class: 'tile', tabindex: 0, role: 'button', 'aria-label': `Open ${label}` },
      h('img', {
        src: thumbs.get(photo.id) ?? '',
        alt: photo.caption || label,
        loading: 'lazy',
        draggable: 'false',
      }),
      h('figcaption', {}, h('span', {}, label), stats(photo)),
    );
    tile.dataset.id = String(photo.id);
    tile.style.viewTransitionName = `frame-${photo.id}`;
    return tile;
  };

  const render = (): void => {
    ordered = sortPhotos(photos, mode);
    tiles.clear();
    rows.replaceChildren(
      ...ordered.map((photo) => {
        const tile = createTile(photo);
        tiles.set(photo.id, tile);
        return tile;
      }),
    );
    count.textContent = `· ${plural(photos.length, 'frame')}`;
  };

  function setMode(next: SortMode): void {
    if (next === mode && next !== 'shuffle') {
      return;
    }

    mode = next;
    writeJSON(SORT_KEY, mode);
    sortButtons.forEach((button, i) =>
      button.setAttribute('aria-checked', String(SORT_MODES[i] === mode)),
    );
    withTransition(render);
  }

  const openFrom = (target: EventTarget | null): void => {
    const tile = target instanceof Element ? target.closest<HTMLElement>('.tile') : null;
    if (tile?.dataset.id) {
      onOpen(Number(tile.dataset.id), tile);
    }
  };

  rows.addEventListener('click', (event) => openFrom(event.target));
  rows.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFrom(event.target);
    }
  });

  onLikesChange(() => {
    for (const photo of photos) {
      tiles.get(photo.id)?.querySelector('.tile__stats')?.replaceWith(stats(photo));
    }
  });

  const toggle = (open = !hasFlag('gridview')): void => {
    setFlag('gridview', open);
    root.inert = !open;
    gridButton.setAttribute('aria-pressed', String(open));
    if (open) {
      root.scrollTop = 0;
    }
    onToggle(open);
  };

  return {
    setPhotos(nextPhotos, nextThumbs) {
      photos = nextPhotos;
      thumbs = nextThumbs;
      render();
    },
    toggle,
    isOpen: () => hasFlag('gridview'),
    tileOf: (photoId) => tiles.get(photoId),
    order: () => ordered,
  };
};
