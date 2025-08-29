/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Canvas utilities for drawing operations and mask processing
 */

/**
 * Draws red borders around the masked area on the original image for debugging
 * @param baseImageFile - The base image file
 * @param maskDataUrl - Data URL of the mask defining the area
 * @returns Promise resolving to File with red borders drawn
 */
export const drawRedBordersFromMask = async (
  baseImageFile: File,
  maskDataUrl: string
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    const baseImg = new Image();
    baseImg.src = URL.createObjectURL(baseImageFile);
    await baseImg.decode();
    URL.revokeObjectURL(baseImg.src);

    const maskImg = new Image();
    maskImg.src = maskDataUrl;
    await maskImg.decode();

    const canvas = document.createElement('canvas');
    canvas.width = baseImg.naturalWidth;
    canvas.height = baseImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Could not get canvas context.'));

    // Draw the original image
    ctx.drawImage(baseImg, 0, 0);

    // Create a temporary canvas for edge detection
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return reject(new Error('Could not get temp canvas context.'));

    // Draw mask to temp canvas and get image data for edge detection
    tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Find edge pixels of the mask using neighbor checking
    const edges = new Set<string>();
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x) * 4;
        const alpha = data[idx + 3];
        
        if (alpha > 0) {
          // Check 8-connected neighbors
          const neighbors = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
          ];
          
          for (const [dx, dy] of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            const nidx = (ny * canvas.width + nx) * 4;
            const nalpha = data[nidx + 3];
            
            // If neighbor is transparent, this is an edge pixel
            if (nalpha === 0) {
              edges.add(`${x},${y}`);
              break;
            }
          }
        }
      }
    }

    // Draw red borders using edge pixels
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    
    // Convert edge pixels to connected paths
    const visited = new Set<string>();
    edges.forEach(edge => {
      if (!visited.has(edge)) {
        const [startX, startY] = edge.split(',').map(Number);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        let currentX = startX;
        let currentY = startY;
        visited.add(edge);
        
        // Try to follow the edge path
        let found = true;
        while (found) {
          found = false;
          const neighbors = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
          ];
          
          for (const [dx, dy] of neighbors) {
            const nx = currentX + dx;
            const ny = currentY + dy;
            const nkey = `${nx},${ny}`;
            
            if (edges.has(nkey) && !visited.has(nkey)) {
              ctx.lineTo(nx, ny);
              visited.add(nkey);
              currentX = nx;
              currentY = ny;
              found = true;
              break;
            }
          }
        }
        
        ctx.stroke();
      }
    });

    canvas.toBlob(blob => {
      if (blob) {
        resolve(new File([blob], 'red-border-image.jpeg', { type: 'image/jpeg' }));
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/jpeg', 0.95);
  });
};

/**
 * Draws purple filled area based on the mask on the original image
 * @param baseImageFile - The base image file
 * @param maskDataUrl - Data URL of the mask defining the area
 * @returns Promise resolving to File with purple fill drawn
 */
export const drawPurpleFillFromMask = async (
  baseImageFile: File,
  maskDataUrl: string
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    const baseImg = new Image();
    baseImg.src = URL.createObjectURL(baseImageFile);
    await baseImg.decode();
    URL.revokeObjectURL(baseImg.src);

    const maskImg = new Image();
    maskImg.src = maskDataUrl;
    await maskImg.decode();

    const canvas = document.createElement('canvas');
    canvas.width = baseImg.naturalWidth;
    canvas.height = baseImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Could not get canvas context.'));

    // Draw the original image
    ctx.drawImage(baseImg, 0, 0);

    // Draw the mask with purple fill using composite operation
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(128, 0, 128, 0.8)'; // Purple with 80% opacity
    
    // Create temporary canvas to process mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return reject(new Error('Could not get temp canvas context.'));
    
    // Draw mask to temp canvas
    tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
    
    // Apply purple fill where mask is not transparent
    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    ctx.beginPath();
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const alpha = data[idx + 3];
        
        if (alpha > 0) {
          ctx.rect(x, y, 1, 1);
        }
      }
    }
    ctx.fill();

    canvas.toBlob(blob => {
      if (blob) {
        resolve(new File([blob], 'purple-fill-image.jpeg', { type: 'image/jpeg' }));
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/jpeg', 0.95);
  });
};

/**
 * Draws red marker at specified position on the original image
 * @param baseImageFile - The base image file
 * @param markerPosition - Position {x, y} for the marker
 * @returns Promise resolving to File with red marker drawn
 */
export const drawRedMarkerFromPosition = async (
  baseImageFile: File,
  markerPosition: {x: number, y: number}
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    const baseImg = new Image();
    baseImg.src = URL.createObjectURL(baseImageFile);
    await baseImg.decode();
    URL.revokeObjectURL(baseImg.src);

    const canvas = document.createElement('canvas');
    canvas.width = baseImg.naturalWidth;
    canvas.height = baseImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Could not get canvas context.'));

    // Draw the original image
    ctx.drawImage(baseImg, 0, 0);

    // Make radius proportional to image size, but with a minimum
    const markerRadius = Math.max(10, Math.min(canvas.width, canvas.height) * 0.03);

    // Draw the marker (red circle with white outline)
    ctx.beginPath();
    ctx.arc(markerPosition.x, markerPosition.y, markerRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.lineWidth = markerRadius * 0.2;
    ctx.strokeStyle = 'white';
    ctx.stroke();

    canvas.toBlob(blob => {
      if (blob) {
        resolve(new File([blob], 'red-marker-image.jpeg', { type: 'image/jpeg' }));
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/jpeg', 0.95);
  });
};

/**
 * Creates a circular mask from marker position
 * @param imageFile - The base image file to get dimensions
 * @param markerPosition - Position {x, y} for the marker
 * @returns Promise resolving to mask data URL
 */
export const createMaskFromMarkerPosition = async (
  imageFile: File,
  markerPosition: {x: number, y: number}
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(imageFile);
    await img.decode();
    URL.revokeObjectURL(img.src);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Could not get canvas context.'));

    // Create white circular mask
    ctx.fillStyle = 'white';
    const markerRadius = Math.max(10, Math.min(canvas.width, canvas.height) * 0.03);
    ctx.beginPath();
    ctx.arc(markerPosition.x, markerPosition.y, markerRadius, 0, Math.PI * 2);
    ctx.fill();

    resolve(canvas.toDataURL());
  });
};

/**
 * Crops a square region around the marker position from the base image.
 * The crop size is a fraction of the shortest image side and clamped to image bounds.
 * @param baseImageFile - The base image file
 * @param markerPosition - Position {x, y} for the crop center
 * @param sizeFraction - Fraction of min(width,height) to use as crop size (0.1 - 1.0)
 * @returns Promise resolving to File containing the cropped square image (PNG)
 */
export const cropSquareAroundMarker = async (
  baseImageFile: File,
  markerPosition: { x: number; y: number },
  sizeFraction = 0.4
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    try {
      const img = new Image();
      img.src = URL.createObjectURL(baseImageFile);
      await img.decode();
      URL.revokeObjectURL(img.src);

      const minSide = Math.min(img.naturalWidth, img.naturalHeight);
      const clampedFraction = Math.min(1, Math.max(0.1, sizeFraction));
      const cropSize = Math.round(minSide * clampedFraction);

      let x = Math.round(markerPosition.x - cropSize / 2);
      let y = Math.round(markerPosition.y - cropSize / 2);

      // Clamp to image bounds
      x = Math.max(0, Math.min(x, img.naturalWidth - cropSize));
      y = Math.max(0, Math.min(y, img.naturalHeight - cropSize));

      const canvas = document.createElement('canvas');
      canvas.width = cropSize;
      canvas.height = cropSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context.'));

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, cropSize, cropSize, 0, 0, cropSize, cropSize);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], 'cropped-material.png', { type: 'image/png' }));
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        0.95
      );
    } catch (e) {
      reject(e);
    }
  });
};
