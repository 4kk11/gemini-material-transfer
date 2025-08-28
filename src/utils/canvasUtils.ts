/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Canvas utilities for drawing operations and mask processing
 */

import { resizeImage } from './imageUtils';

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
 * Creates model input image with mask applied in different modes
 * @param baseImageFile - The base image file
 * @param maskDataUrl - Data URL of the mask
 * @param mode - Processing mode: 'isolate' for material extraction, 'inpaint' for scene processing
 * @returns Promise resolving to processed File
 */
export const createModelInputImage = (
  baseImageFile: File,
  maskDataUrl: string,
  mode: 'isolate' | 'inpaint'
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    const targetDimension = 1024;
    const baseImg = new Image();
    baseImg.src = URL.createObjectURL(baseImageFile);
    await baseImg.decode();
    URL.revokeObjectURL(baseImg.src);

    const maskImg = new Image();
    maskImg.src = maskDataUrl;
    await maskImg.decode();

    const canvas = document.createElement('canvas');
    canvas.width = targetDimension;
    canvas.height = targetDimension;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return reject(new Error('Could not get canvas context.'));
    
    // Fill with black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, targetDimension, targetDimension);
    
    // Calculate sizing to fit image within square while maintaining aspect ratio
    const aspectRatio = baseImg.naturalWidth / baseImg.naturalHeight;
    let newWidth, newHeight;
    if (aspectRatio > 1) {
      newWidth = targetDimension;
      newHeight = targetDimension / aspectRatio;
    } else {
      newHeight = targetDimension;
      newWidth = targetDimension * aspectRatio;
    }
    const x = (targetDimension - newWidth) / 2;
    const y = (targetDimension - newHeight) / 2;

    // Draw the base image
    ctx.drawImage(baseImg, x, y, newWidth, newHeight);

    if (mode === 'isolate') {
      // For material extraction: apply mask to isolate the material area
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskImg, x, y, newWidth, newHeight);
    } else { // inpaint mode
      // For scene inpainting: convert mask to magenta overlay for AI guidance
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetDimension;
      tempCanvas.height = targetDimension;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return reject('Could not get temp canvas context');

      // Draw mask and convert to magenta overlay
      tempCtx.drawImage(maskImg, x, y, newWidth, newHeight);
      const imageData = tempCtx.getImageData(0, 0, targetDimension, targetDimension);
      const data = imageData.data;
      
      // Convert mask pixels to magenta (R=255, G=0, B=255)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // If pixel is not transparent in mask
          data[i] = 255;     // R
          data[i + 1] = 0;   // G
          data[i + 2] = 255; // B
          data[i + 3] = 255; // A
        }
      }
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);
    }

    canvas.toBlob(blob => {
      if (blob) {
        resolve(new File([blob], `${mode}-image.png`, { type: 'image/png' }));
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/png');
  });
};