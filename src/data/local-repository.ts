import { readJSON, writeJSON } from '@/lib/storage';
import {
  deletePhoto,
  dropDatabase,
  forgetOwnUrl,
  getPhoto,
  loadOwnUrls,
  putPhoto,
  rememberOwnUrl,
} from './blobs';
import { buildDemo } from './demo';
import { freshId } from './edits';
import { cleanArchive } from './repository';
import type { Repository } from './repository';
import type { Credit, PhotoRef } from './types';

const KEY = 'archive';

/** The owner: the graph in localStorage, the photo files in IndexedDB. */
export const localRepository = (credits: Credit[]): Repository => ({
  editable: true,
  async load() {
    // the first login starts from a copy of the demo, so there is something to explore
    const data = cleanArchive(readJSON<unknown>(KEY, null)) ?? buildDemo(credits);
    await loadOwnUrls(data);
    return data;
  },
  save(data) {
    // the caller tells the owner: an edit that was not kept must not look as if it was
    if (!writeJSON(KEY, data)) throw new Error('the archive could not be kept');
  },
  async addPhoto(blob, name) {
    const id = freshId('p');
    await putPhoto(id, blob);
    rememberOwnUrl(id, URL.createObjectURL(blob));
    return { kind: 'own', id, name };
  },
  async dropPhotos(refs: PhotoRef[]) {
    for (const ref of refs) {
      if (ref.kind !== 'own') continue;
      forgetOwnUrl(ref.id);
      try {
        await deletePhoto(ref.id);
      } catch {
        // the file is already gone; the archive no longer points at it either
      }
    }
  },
  readPhoto: getPhoto,
  async restore(data, photos) {
    // the old photos go first, so nothing of them is left next to the restored archive
    writeJSON(KEY, null);
    await dropDatabase();
    for (const [id, blob] of photos) await putPhoto(id, blob);
    if (!writeJSON(KEY, data)) throw new Error('the archive could not be kept');
  },
  async clear() {
    writeJSON(KEY, null);
    await dropDatabase();
  },
});
