/**
 * Portraits are stored inline as small data URLs so a character file stays
 * one self-contained JSON document. Images are centre-cropped to a square and
 * scaled down in the browser before they ever reach the file.
 */
export const PORTRAIT_SIZE = 256;

export class PortraitError extends Error {}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PortraitError('That file is not an image the browser can read.'));
    };
    image.src = url;
  });
}

/** Square-crop and downscale an image file to a JPEG data URL. */
export async function blobToPortrait(blob: Blob, size = PORTRAIT_SIZE): Promise<string> {
  if (!blob.type.startsWith('image/')) throw new PortraitError('Only image files can be used as a portrait.');
  const image = await loadImage(blob);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (!side) throw new PortraitError('That image is empty.');
  const target = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const context = canvas.getContext('2d');
  if (!context) throw new PortraitError('This browser cannot resize images.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    target,
    target,
  );
  return canvas.toDataURL('image/jpeg', 0.86);
}

/** The first image in a paste or drop, if any. */
export function imageFromTransfer(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
  }
  for (const file of Array.from(data.files ?? [])) {
    if (file.type.startsWith('image/')) return file;
  }
  return null;
}
