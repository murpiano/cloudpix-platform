import { effectFilter } from './effects';

export interface BakeOptions {
  effect: string;
  /** 0..100 */
  strength: number;
  /** Crop zoom in percent, 100..200: 150 keeps the central 2/3 of the frame. */
  zoom: number;
  /** Width of the on-screen preview; pixel filters (blur) are scaled from it. */
  previewWidth: number;
}

export interface CropPlan {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  width: number;
  height: number;
}

export const MAX_OUTPUT_SIDE = 2048;

/** Central crop for `zoom`, then fit into MAX_OUTPUT_SIDE without upscaling. */
export const planCrop = (width: number, height: number, zoom: number): CropPlan => {
  const factor = Math.min(2, Math.max(1, zoom / 100));
  const sw = width / factor;
  const sh = height / factor;
  const fit = Math.min(1, MAX_OUTPUT_SIDE / Math.max(sw, sh));

  return {
    sx: (width - sw) / 2,
    sy: (height - sh) / 2,
    sw,
    sh,
    width: Math.round(sw * fit),
    height: Math.round(sh * fit),
  };
};

/**
 * Renders the final frame — crop, effect and all — into a JPEG, so what the
 * archive shows is exactly what the author saw in the studio.
 */
export const bakeFrame = async (source: Blob, options: BakeOptions): Promise<Blob> => {
  const bitmap = await createImageBitmap(source);
  const plan = planCrop(bitmap.width, bitmap.height, options.zoom);

  const canvas = document.createElement('canvas');
  canvas.width = plan.width;
  canvas.height = plan.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }

  const px = options.previewWidth > 0 ? plan.width / options.previewWidth : 1;
  context.filter = effectFilter(options.effect, options.strength, px);
  context.drawImage(bitmap, plan.sx, plan.sy, plan.sw, plan.sh, 0, 0, plan.width, plan.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the frame'))),
      'image/jpeg',
      0.9,
    );
  });
};
