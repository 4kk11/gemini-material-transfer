/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useState } from 'react';
import BaseImageUploader, { type BaseImageUploaderProps } from './BaseImageUploader';

interface BrushImageUploaderProps extends Omit<BaseImageUploaderProps, 'children' | 'maskInteractionHandlers'> {}

const BrushImageUploader: React.FC<BrushImageUploaderProps> = (props) => {
  const { imageUrl, onMaskUpdate } = props;
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  const getScaledCoords = (clientX: number, clientY: number) => {
    const container = document.querySelector(`[data-dropzone-id="${props.id}"]`) as HTMLDivElement;
    const img = container?.querySelector('img');
    if (!container || !img) return null;

    const containerRect = container.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;

    // Calculate actual displayed image size with object-contain
    const imgAspect = naturalWidth / naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    let actualDisplayWidth: number, actualDisplayHeight: number;
    
    if (imgAspect > containerAspect) {
      // Image is wider, fit to width
      actualDisplayWidth = containerRect.width;
      actualDisplayHeight = containerRect.width / imgAspect;
    } else {
      // Image is taller, fit to height
      actualDisplayHeight = containerRect.height;
      actualDisplayWidth = containerRect.height * imgAspect;
    }

    const offsetX = (containerRect.width - actualDisplayWidth) / 2;
    const offsetY = (containerRect.height - actualDisplayHeight) / 2;

    const x = (clientX - containerRect.left - offsetX) / actualDisplayWidth * naturalWidth;
    const y = (clientY - containerRect.top - offsetY) / actualDisplayHeight * naturalHeight;
    
    return { x, y };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
    const clientX = 'touches' in nativeEvent ? nativeEvent.touches[0].clientX : (nativeEvent as MouseEvent).clientX;
    const clientY = 'touches' in nativeEvent ? nativeEvent.touches[0].clientY : (nativeEvent as MouseEvent).clientY;
    
    const coords = getScaledCoords(clientX, clientY);
    if (!coords) return;
    
    const canvas = document.querySelector(`[data-dropzone-id="${props.id}"] canvas`) as HTMLCanvasElement;
    const img = document.querySelector(`[data-dropzone-id="${props.id}"] img`) as HTMLImageElement;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'white';
    
    // Calculate actual display width for consistent brush size
    const { naturalWidth, naturalHeight } = img;
    const containerRect = document.querySelector(`[data-dropzone-id="${props.id}"]`)!.getBoundingClientRect();
    const imgAspect = naturalWidth / naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    const actualDisplayWidth = imgAspect > containerAspect 
      ? containerRect.width 
      : containerRect.height * imgAspect;
    
    ctx.lineWidth = brushSize * (canvas.width / actualDisplayWidth);

    if (lastPos.current) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }
    lastPos.current = coords;
  }
  
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!onMaskUpdate) return;
    
    setIsDrawing(true);
    lastPos.current = null; // Reset last position on new stroke
    draw(e); // Draw a dot on single click
  };

  const stopDrawing = () => {
    if (isDrawing && onMaskUpdate) {
        const canvas = document.querySelector(`[data-dropzone-id="${props.id}"] canvas`) as HTMLCanvasElement;
        if (canvas) {
            onMaskUpdate(canvas.toDataURL());
        }
    }
    setIsDrawing(false);
    lastPos.current = null;
  };
  
  const handleClearMask = (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = document.querySelector(`[data-dropzone-id="${props.id}"] canvas`) as HTMLCanvasElement;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        onMaskUpdate?.(null);
    }
  }

  const maskInteractionHandlers = {
    onMouseDown: imageUrl ? startDrawing : undefined,
    onMouseMove: imageUrl ? draw : undefined,
    onMouseUp: imageUrl ? stopDrawing : undefined,
    onMouseLeave: imageUrl ? stopDrawing : undefined,
    onTouchStart: imageUrl ? startDrawing : undefined,
    onTouchMove: imageUrl ? draw : undefined,
    onTouchEnd: imageUrl ? stopDrawing : undefined,
  };

  const controls = imageUrl && onMaskUpdate ? (
    <div className="w-full mt-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-zinc-200 text-zinc-800 text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
          <span>Brush:</span>
          <input
            type="range"
            min="5"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-16 h-1 bg-gray-300 rounded-full appearance-none cursor-pointer"
          />
          <span className="text-xs">{brushSize}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {props.maskUrl && (
          <button
            onClick={handleClearMask}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-all shadow-lg"
            aria-label="Clear mask"
          >
            Clear Mask
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <BaseImageUploader
      {...props}
      maskInteractionHandlers={maskInteractionHandlers}
    >
      {controls}
    </BaseImageUploader>
  );
};

export default BrushImageUploader;