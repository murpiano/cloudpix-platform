export interface DecodedImage {
  src: string;
  width: number;
  height: number;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));

/**
 * Loads an image once and, when it is wider than `maxWidth`, re-encodes a
 * downscaled copy so dozens of 3D cards do not keep full-size bitmaps alive.
 * Falls back to the original URL whenever canvas or CORS gets in the way.
 */
export const decodeImage = async (url: string, maxWidth: number): Promise<DecodedImage> => {
  const image = await loadImage(url);
  const { naturalWidth: width, naturalHeight: height } = image;
  const original = { src: url, width, height };

  if (width <= maxWidth) {
    return original;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = Math.round((height / width) * maxWidth);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas);
    return blob ? { src: URL.createObjectURL(blob), width, height } : original;
  } catch {
    return original;
  }
};
