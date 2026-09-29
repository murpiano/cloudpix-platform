import { readJSON, writeJSON } from '@/lib/storage';
import { deletePhoto, dropDatabase, loadOwnUrls, putPhoto, rememberOwnUrl } from './blobs';
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
    writeJSON(KEY, data);
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
      try {
        await deletePhoto(ref.id);
      } catch {
        // the file is already gone; the archive no longer points at it either
      }
    }
  },
  async clear() {
    writeJSON(KEY, null);
    await dropDatabase();
  },
});
