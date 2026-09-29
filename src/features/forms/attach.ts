import { shrink } from '@/data/image';
import type { Repository } from '@/data/repository';
import type { PhotoRef } from '@/data/types';

/**
 * Makes the files smaller and keeps them, before anything is changed in the archive.
 *
 * Nothing is stored while a single file cannot be read: the caller shows the names back and the
 * person tries again, instead of ending up with half an album. A storage error puts back what it
 * already took and then travels on, so no blob is left behind with nothing pointing at it.
 */
export const attachPhotos = async (
  files: File[],
  repo: Repository,
  smaller: (blob: Blob, name: string) => Promise<Blob> = (blob) => shrink(blob),
): Promise<{ refs: PhotoRef[]; skipped: string[] }> => {
  const ready: { blob: Blob; name: string }[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    try {
      ready.push({ blob: await smaller(file, file.name), name: file.name });
    } catch {
      skipped.push(file.name);
    }
  }
  if (skipped.length > 0) return { refs: [], skipped };

  const refs: PhotoRef[] = [];
  try {
    for (const one of ready) refs.push(await repo.addPhoto(one.blob, one.name));
  } catch (error) {
    await repo.dropPhotos(refs);
    throw error;
  }
  return { refs, skipped };
};
