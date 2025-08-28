/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Image processing utilities for dimensions, resizing, and cropping operations
 */

/**
 * Gets intrinsic dimensions of an image from a File object
 * @param file - The image file to analyze
 * @returns Promise resolving to width and height dimensions
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("Failed to read file."));
      }
      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
    };
    reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
  });
};

/**
 * Resizes an image to fit within a square target dimension with black padding
 * @param file - The image file to resize
 * @param targetDimension - The target square dimension (width and height)
 * @returns Promise resolving to resized File
 */
export const resizeImage = (file: File, targetDimension: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("Failed to read file."));
      }
      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetDimension;
        canvas.height = targetDimension;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context.'));

        // Fill background with black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, targetDimension, targetDimension);

        // Calculate dimensions to fit within square while maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        let newWidth, newHeight;
        if (aspectRatio > 1) {
          // Landscape: fit to width
          newWidth = targetDimension;
          newHeight = targetDimension / aspectRatio;
        } else {
          // Portrait or square: fit to height
          newHeight = targetDimension;
          newWidth = targetDimension * aspectRatio;
        }

        // Center the image
        const x = (targetDimension - newWidth) / 2;
        const y = (targetDimension - newHeight) / 2;
        
        ctx.drawImage(img, x, y, newWidth, newHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            reject(new Error('Canvas to Blob conversion failed.'));
          }
        }, 'image/jpeg', 0.95);
      };
      img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
    };
    reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
  });
};

/**
 * Crops a square image back to original aspect ratio, removing padding
 * @param imageDataUrl - Data URL of the square image to crop
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param targetDimension - The square dimension the image was resized to
 * @returns Promise resolving to cropped image data URL
 */
export const cropToOriginalAspectRatio = (
  imageDataUrl: string,
  originalWidth: number,
  originalHeight: number,
  targetDimension: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      const aspectRatio = originalWidth / originalHeight;
      let contentWidth, contentHeight;
      
      // Calculate the content area dimensions within the square
      if (aspectRatio > 1) { // Landscape
        contentWidth = targetDimension;
        contentHeight = targetDimension / aspectRatio;
      } else { // Portrait or square
        contentHeight = targetDimension;
        contentWidth = targetDimension * aspectRatio;
      }

      // Calculate crop coordinates (centered content)
      const x = (targetDimension - contentWidth) / 2;
      const y = (targetDimension - contentHeight) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = contentWidth;
      canvas.height = contentHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context for cropping.'));
      }
      
      // Extract the content area from the square image
      ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
      
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = (err) => reject(new Error(`Image load error during cropping: ${err}`));
  });
};