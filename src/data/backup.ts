import { cleanArchive } from './repository';
import type { AlbumData, ArchiveData, Id, PhotoRef } from './types';

/** A backup is one JSON file: the archive and, for each of the owner's photos, the file itself. */
export interface BackupFile {
  app: 'my-world';
  version: 1;
  exportedAt: string;
  archive: ArchiveData;
  photos: Record<Id, { type: string; data: string }>;
}

const ownPhotos = (data: ArchiveData): Extract<PhotoRef, { kind: 'own' }>[] =>
  data.countries
    .flatMap((country) => country.cities)
    .flatMap((city) => city.albums)
    .flatMap((album) => album.photos)
    .filter((photo): photo is Extract<PhotoRef, { kind: 'own' }> => photo.kind === 'own');

/** Takes out the photos of the owner whose file is not there; the count keeps what it claimed. */
const dropMissing = (album: AlbumData, has: (id: Id) => boolean): void => {
  const before = album.photos.length;
  album.photos = album.photos.filter((photo) => photo.kind !== 'own' || has(photo.id));
  album.photoCount = Math.max(
    album.photos.length,
    album.photoCount - (before - album.photos.length),
  );
};

const toBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
};

const fromBase64 = (data: string, type: string): Blob => {
  const text = atob(data);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return new Blob([bytes], { type });
};

/** The file to keep: a photo whose file is gone is left out of it, and its reference with it. */
export const makeBackup = async (
  data: ArchiveData,
  readPhoto: (id: Id) => Promise<Blob | null>,
  now = new Date(),
): Promise<Blob> => {
  const photos: BackupFile['photos'] = {};
  for (const photo of ownPhotos(data)) {
    const blob = await readPhoto(photo.id).catch(() => null);
    if (blob) photos[photo.id] = { type: blob.type || 'image/jpeg', data: await toBase64(blob) };
  }
  const archive = structuredClone(data);
  for (const city of archive.countries.flatMap((country) => country.cities)) {
    for (const album of city.albums) {
      dropMissing(album, (id) => photos[id] !== undefined);
    }
  }
  const file: BackupFile = {
    app: 'my-world',
    version: 1,
    exportedAt: now.toISOString(),
    archive,
    photos,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
};

export interface Backup {
  archive: ArchiveData;
  photos: Map<Id, Blob>;
}

/** Reads a backup file; null when it is not one of ours or is too damaged to use. */
export const readBackup = (text: string): Backup | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const file = raw as Partial<BackupFile>;
  if (file.app !== 'my-world' || file.version !== 1) return null;
  const archive = cleanArchive(file.archive);
  if (!archive) return null;
  const photos = new Map<Id, Blob>();
  for (const [id, item] of Object.entries(file.photos ?? {})) {
    if (typeof item?.data !== 'string' || typeof item.type !== 'string') continue;
    try {
      photos.set(id, fromBase64(item.data, item.type));
    } catch {
      // a photo that cannot be read is dropped below, with its reference
    }
  }
  // a reference to a photo the file does not carry would only be a blank tile
  for (const city of archive.countries.flatMap((country) => country.cities)) {
    for (const album of city.albums) {
      dropMissing(album, (id) => photos.has(id));
    }
  }
  const kept = new Set(ownPhotos(archive).map((photo) => photo.id));
  for (const id of [...photos.keys()]) if (!kept.has(id)) photos.delete(id);
  return { archive, photos };
};
