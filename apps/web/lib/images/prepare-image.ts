/*
 * This file prepares photos in the browser before they are uploaded.
 */

const AVATAR_SIZE = 512;
const EVIDENCE_MAX_SIDE = 1600;
const OUTPUT_TYPE = 'image/jpeg';
const OUTPUT_QUALITY = 0.86;

// Loads an image file into an element the canvas can draw.
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    image.src = url;
  });
}

interface DrawArea {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
}

// Draws part of the photo onto a canvas and re-encodes it as JPEG, so large phone photos
// become a small upload and the result always has a supported type.
async function encodeImage(file: File, fileName: string, area: (image: HTMLImageElement) => DrawArea): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  let image: HTMLImageElement;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error('This image format is not supported by your browser. Choose a JPEG, PNG or WebP image.');
  }
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('The image appears to be empty.');

  const { sourceX, sourceY, sourceWidth, sourceHeight, outputWidth, outputHeight } = area(image);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not process this image.');

  // JPEG has no transparency, so transparent PNG areas become white rather than black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
  });
  if (!blob) throw new Error('Your browser could not process this image.');

  return new File([blob], fileName, { type: OUTPUT_TYPE });
}

// Crops the photo to a centred square and scales it to 512px.
export function prepareAvatar(file: File): Promise<File> {
  return encodeImage(file, 'avatar.jpg', (image) => {
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const outputSide = Math.min(AVATAR_SIZE, side);
    return {
      sourceX: (image.naturalWidth - side) / 2,
      sourceY: (image.naturalHeight - side) / 2,
      sourceWidth: side,
      sourceHeight: side,
      outputWidth: outputSide,
      outputHeight: outputSide,
    };
  });
}

// Keeps the whole photo and scales it so the longest side is at most 1600px.
export function prepareEvidencePhoto(file: File): Promise<File> {
  return encodeImage(file, 'evidence.jpg', (image) => {
    const scale = Math.min(1, EVIDENCE_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight,
      outputWidth: Math.round(image.naturalWidth * scale),
      outputHeight: Math.round(image.naturalHeight * scale),
    };
  });
}
