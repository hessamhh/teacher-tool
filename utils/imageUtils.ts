
import type { ImageFile } from '../types';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.85;

export const compressImage = (imageFile: ImageFile): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = height * ratio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context for compression.'));
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedMimeType = 'image/jpeg';
      const compressedBase64 = canvas.toDataURL(compressedMimeType, JPEG_QUALITY);

      resolve({
        ...imageFile,
        base64: compressedBase64,
        mimeType: compressedMimeType,
        name: imageFile.name.replace(/\.[^/.]+$/, ".jpg") // Update name to reflect new format
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for compression.'));
    };
    img.src = imageFile.base64;
  });
};
