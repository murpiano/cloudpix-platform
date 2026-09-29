import type { ArchiveData, Id, PhotoRef } from './types';

const DB = 'my-world';
const STORE = 'photos';

/** Object urls of the owner's photos, by id. The UI reads them through `photoUrl`. */
const urls = new Map<Id, string>();

export const rememberOwnUrl = (id: Id, url: string): void => {
  urls.set(id, url);
};

export const ownUrl = (id: Id): string | null => urls.get(id) ?? null;

const revoke = (url: string) => {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // nothing to revoke where there is no browser
  }
};

/** One photo is gone: its url goes with it, so the blob does not sit in memory for the session. */
export const forgetOwnUrl = (id: Id): void => {
  const url = urls.get(id);
  if (url === undefined) return;
  revoke(url);
  urls.delete(id);
};

export const forgetOwnUrls = (): void => {
  for (const url of urls.values()) revoke(url);
  urls.clear();
};

const open = (): Promise<IDBDatabase> =>
  new Promise((ok, no) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => ok(request.result);
    request.onerror = () => no(request.error);
  });

const run = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> => {
  const db = await open();
  return new Promise<T | undefined>((ok, no) => {
    const transaction = db.transaction(STORE, mode);
    const request = fn(transaction.objectStore(STORE));
    transaction.oncomplete = () => ok(request.result);
    transaction.onerror = () => no(transaction.error);
  });
};

export const getPhoto = async (id: Id): Promise<Blob | null> =>
  (await run<Blob>('readonly', (store) => store.get(id) as IDBRequest<Blob>)) ?? null;

export const putPhoto = (id: Id, blob: Blob): Promise<unknown> =>
  run('readwrite', (store) => store.put(blob, id));

export const deletePhoto = (id: Id): Promise<unknown> =>
  run('readwrite', (store) => store.delete(id));

export const dropDatabase = (): Promise<void> =>
  new Promise((ok) => {
    forgetOwnUrls();
    const request = indexedDB.deleteDatabase(DB);
    request.onsuccess = () => ok();
    request.onerror = () => ok();
    request.onblocked = () => ok();
  });

/** Makes a url for every own photo of the archive. A blob that is gone leaves a blank tile. */
export const loadOwnUrls = async (data: ArchiveData): Promise<void> => {
  const refs: PhotoRef[] = data.countries
    .flatMap((country) => country.cities)
    .flatMap((city) => city.albums)
    .flatMap((album) => album.photos);
  for (const ref of refs) {
    if (ref.kind !== 'own' || urls.has(ref.id)) continue;
    try {
      const blob = await run<Blob>('readonly', (store) => store.get(ref.id) as IDBRequest<Blob>);
      if (blob) rememberOwnUrl(ref.id, URL.createObjectURL(blob));
    } catch {
      // no database, no photo: the tile stays blank
    }
  }
};
