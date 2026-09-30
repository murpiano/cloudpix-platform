import type { Storage } from '@/backend/types';
import { forgetOwnUrl, forgetOwnUrls, rememberOwnUrl } from './blobs';
import { buildDemo } from './demo';
import { freshId } from './edits';
import { cleanArchive } from './repository';
import type { Repository } from './repository';
import type { ArchiveData, Credit, Id, PhotoRef } from './types';

const ownIds = (data: ArchiveData): Id[] =>
  data.countries
    .flatMap((country) => country.cities)
    .flatMap((city) => city.albums)
    .flatMap((album) => album.photos)
    .flatMap((photo) => (photo.kind === 'own' ? [photo.id] : []));

/** The signed-in account: the archive and the photo files live with the backend. */
export const remoteRepository = (store: Storage, credits: Credit[]): Repository => {
  // saves go one after another, so a slow one can never land after a newer one
  let queue: Promise<unknown> = Promise.resolve();

  return {
    editable: true,
    async load() {
      // a new account starts from a copy of the demo, so there is something to explore
      const data = cleanArchive(await store.loadArchive()) ?? buildDemo(credits);
      const ids = ownIds(data);
      const urls = await store.photoUrls(ids).catch(() => new Map<Id, string>());
      for (const [id, url] of urls) rememberOwnUrl(id, url);
      return data;
    },
    save(data) {
      // what is sent is a copy: the graph may change again while it is on its way
      const copy = structuredClone(data);
      const sent = queue.then(() => store.saveArchive(copy));
      queue = sent.catch(() => undefined);
      return sent;
    },
    async addPhoto(blob, name) {
      const id = freshId('p');
      await store.putPhoto(id, blob);
      rememberOwnUrl(id, URL.createObjectURL(blob));
      return { kind: 'own', id, name };
    },
    async dropPhotos(refs: PhotoRef[]) {
      const ids = refs.flatMap((ref) => (ref.kind === 'own' ? [ref.id] : []));
      for (const id of ids) forgetOwnUrl(id);
      try {
        await store.removePhotos(ids);
      } catch {
        // the file stays behind at worst; the archive no longer points at it
      }
    },
    readPhoto: (id) => store.getPhoto(id),
    async restore(data, photos) {
      await store.wipe();
      forgetOwnUrls();
      for (const [id, blob] of photos) await store.putPhoto(id, blob);
      await store.saveArchive(data);
    },
    async clear() {
      await store.wipe();
      forgetOwnUrls();
    },
  };
};
