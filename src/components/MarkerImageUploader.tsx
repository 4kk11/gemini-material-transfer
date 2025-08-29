/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import BaseImageUploader, { type BaseImageUploaderProps } from './BaseImageUploader';

interface MarkerImageUploaderProps extends Omit<BaseImageUploaderProps, 'children' | 'maskInteractionHandlers' | 'onMaskUpdate'> {
  onMarkerUpdate?: (markerPosition: {x: number, y: number} | null) => void;
}

const MarkerImageUploader: React.FC<MarkerImageUploaderProps> = (props) => {
  const { imageUrl, onMarkerUpdate } = props;
  const [markers, setMarkers] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    if (!imageUrl) {
      setMarkers([]);
    }
  }, [imageUrl]);

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

  const handleMarkerClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!onMarkerUpdate) return;
    
    const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
    const clientX = 'touches' in nativeEvent ? nativeEvent.touches[0].clientX : (nativeEvent as MouseEvent).clientX;
    const clientY = 'touches' in nativeEvent ? nativeEvent.touches[0].clientY : (nativeEvent as MouseEvent).clientY;
    
    const coords = getScaledCoords(clientX, clientY);
    if (!coords) return;
    
    const newMarkers = [coords]; // Only allow one marker
    setMarkers(newMarkers);
    
    // Update marker position
    onMarkerUpdate(coords);
  };

  const handleClearMarker = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMarkers([]);
    onMarkerUpdate?.(null);
  }

  // Custom canvas update effect for markers
  useEffect(() => {
    if (!imageUrl) return;

    const updateCanvas = () => {
      const canvas = document.querySelector(`[data-dropzone-id="${props.id}"] canvas`) as HTMLCanvasElement;
      const img = document.querySelector(`[data-dropzone-id="${props.id}"] img`) as HTMLImageElement;
      if (!canvas || !img) return;

      const { naturalWidth, naturalHeight } = img;
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw markers
      markers.forEach(marker => {
          // Make radius proportional to image size, but with a minimum
          const markerRadius = Math.max(10, Math.min(canvas.width, canvas.height) * 0.03);

          // Draw the marker (red circle with white outline)
          ctx.beginPath();
          ctx.arc(marker.x, marker.y, markerRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = 'red';
          ctx.fill();
          ctx.lineWidth = markerRadius * 0.2;
          ctx.strokeStyle = 'white';
          ctx.stroke();
      });
    };
    
    // Small delay to ensure DOM is ready
    setTimeout(updateCanvas, 10);
  }, [imageUrl, markers, props.id]);

  const maskInteractionHandlers = {
    onMouseDown: imageUrl ? handleMarkerClick : undefined,
    onTouchStart: imageUrl ? handleMarkerClick : undefined,
  };

  const controls = imageUrl && onMarkerUpdate ? (
    <div className="w-full mt-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-zinc-200 text-zinc-800 text-sm font-semibold px-4 py-2 rounded-md">
          <span>Click to place marker</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {markers.length > 0 && (
          <button
            onClick={handleClearMarker}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-all shadow-lg"
            aria-label="Clear marker"
          >
            Clear Marker
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

export default MarkerImageUploader;