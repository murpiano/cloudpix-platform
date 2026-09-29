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
