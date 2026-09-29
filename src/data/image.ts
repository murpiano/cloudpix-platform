const LONG_SIDE = 1600;
const QUALITY = 0.86;

/** Photos are made smaller before they are kept: the long side at most 1600 px, JPEG. */
export const shrink = async (file: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok) => {
    canvas.toBlob((blob) => ok(blob ?? file), 'image/jpeg', QUALITY);
  });
};

export interface ReadyPhoto {
  blob: Blob;
  name: string;
}

/**
 * Makes every file smaller, one by one. A file the browser cannot decode is named in `skipped`
 * instead of throwing: one bad file must not lose the album that is being made with it.
 */
export const shrinkAll = async (
  files: File[],
  smaller: (blob: Blob, name: string) => Promise<Blob> = (blob) => shrink(blob),
): Promise<{ ready: ReadyPhoto[]; skipped: string[] }> => {
  const ready: ReadyPhoto[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    try {
      ready.push({ blob: await smaller(file, file.name), name: file.name });
    } catch {
      skipped.push(file.name);
    }
  }
  return { ready, skipped };
};
