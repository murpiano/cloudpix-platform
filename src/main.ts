import '@/styles/index';
import { assetUrl, fetchPhotos } from '@/api/client';
import type { Photo } from '@/api/types';
import { setFlag } from '@/app/flags';
import { Timing } from '@/config';
import { createArchive } from '@/features/archive/archive';
import { initChrome, mountIcons } from '@/features/chrome/chrome';
import { initCursor } from '@/features/cursor/cursor';
import { createMenu } from '@/features/menu/menu';
import { orbitMetrics } from '@/features/orbit/layout';
import { createOrbit } from '@/features/orbit/orbit';
import type { OrbitItem } from '@/features/orbit/orbit';
import { createSplash } from '@/features/splash/splash';
import { initDropzone } from '@/features/studio/dropzone';
import { createStudio } from '@/features/studio/studio';
import { toast } from '@/features/toast/toast';
import { createViewer } from '@/features/viewer/viewer';
import { onSlow } from '@/lib/async';
import { decodeImage } from '@/lib/decode';
import type { DecodedImage } from '@/lib/decode';
import { isTyping, nextFrame, wait } from '@/lib/dom';

const splash = createSplash();
mountIcons();
initCursor();

let photos: Photo[] = [];
const decoded = new Map<number, DecodedImage>();
const thumbs = new Map<number, string>();

const orbit = createOrbit({
  onOpen: (photoId, card) => viewer.open(photoId, card, photos),
});

const archive = createArchive({
  onOpen: (photoId, tile) => viewer.open(photoId, tile, archive.order()),
  onToggle: () => menu.close(),
});

const viewer = createViewer({
  thumbOf: (photoId) => thumbs.get(photoId),
  sourceOf: (photoId) => (archive.isOpen() ? archive.tileOf(photoId) : orbit.cardOf(photoId)),
  onFocus: (photoId) => orbit.focus(photoId),
});

const studio = createStudio({ onPublished: refresh });

const menu = createMenu({
  onArchive: () => archive.toggle(true),
  onUpload: () => studio.open(),
});

initChrome({
  onUpload: () => studio.open(),
  onToggleGrid: () => archive.toggle(),
});

initDropzone((file) => {
  menu.close();
  viewer.close();
  studio.open(file);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (viewer.isOpen()) {
    viewer.close();
  } else if (studio.isOpen()) {
    if (isTyping(event.target)) {
      (event.target as HTMLElement).blur();
    } else {
      studio.close();
    }
  } else if (menu.isOpen()) {
    menu.close();
  } else if (archive.isOpen()) {
    archive.toggle(false);
  }
});

// Loading

/** Decodes every photo not seen yet; slow images fall back to their original URL. */
const decodeMissing = async (
  list: Photo[],
  onProgress?: (share: number) => void,
): Promise<void> => {
  const missing = list.filter((photo) => !decoded.has(photo.id));
  const { decodeMax } = orbitMetrics(innerWidth, innerHeight);
  const deadline = wait(Timing.DECODE_BACKSTOP).then(() => null);
  let done = 0;

  await Promise.all(
    missing.map(async (photo) => {
      const url = assetUrl(photo.src);
      const image = await Promise.race([decodeImage(url, decodeMax).catch(() => null), deadline]);
      decoded.set(photo.id, image ?? { src: url, width: 3, height: 2 });
      onProgress?.(++done / missing.length);
    }),
  );
};

const applyPhotos = (next: Photo[]): void => {
  photos = next;
  const items: OrbitItem[] = photos.map((photo) => {
    const image = decoded.get(photo.id) as DecodedImage;
    thumbs.set(photo.id, image.src);
    return { photo, image };
  });

  orbit.setItems(items);
  archive.setPhotos(photos, thumbs);
};

async function refresh(): Promise<void> {
  try {
    const next = await onSlow(fetchPhotos(), Timing.WAKE_HINT_AFTER, () =>
      toast('The server is waking up — the archive will refresh in a moment'),
    );
    await decodeMissing(next);
    applyPhotos(next);
    toast('Frame sent into orbit');
  } catch {
    toast('Frame published — reload to see it in the archive', 'error');
  }
}

const reveal = async (): Promise<void> => {
  setFlag('locked', false);
  // Measure twice while the splash still covers the page, so the first visible frame does not jump.
  orbit.relayout(true);
  await nextFrame();
  orbit.relayout(true);
  setFlag('revealed', true);
};

const boot = async (): Promise<void> => {
  let list: Photo[];
  try {
    list = await onSlow(fetchPhotos(), Timing.WAKE_HINT_AFTER, () =>
      splash.status('Waking the server · first visit can take a minute'),
    );
  } catch {
    splash.fail(boot);
    return;
  }

  splash.status('');
  splash.progress(0.15);
  await decodeMissing(list, (share) => splash.progress(0.15 + share * 0.85));
  applyPhotos(list);

  await splash.finish();
  await reveal();
};

void boot();
