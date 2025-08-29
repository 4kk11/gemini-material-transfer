/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';

interface ImageComparisonSliderProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  debugImageUrl?: string | null;
  onDebugClick?: () => void;
}

const ImageComparisonSlider: React.FC<ImageComparisonSliderProps> = ({
  beforeImageUrl,
  afterImageUrl,
  beforeLabel = "Before",
  afterLabel = "After",
  debugImageUrl,
  onDebugClick
}) => {
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateSliderPosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    updateSliderPosition(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateSliderPosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  return (
    <div className="mt-12 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-extrabold text-zinc-100">Before & After Comparison</h2>
      </div>
      
      <div className="w-full max-w-4xl mx-auto relative">
        <div 
          ref={containerRef}
          className="bg-zinc-800 border-2 border-zinc-700 rounded-lg overflow-hidden shadow-lg relative cursor-ew-resize select-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
        {/* After image (full) */}
        <div className="relative">
          <img 
            src={afterImageUrl} 
            alt={afterLabel}
            className="w-full h-full object-contain"
            draggable={false}
          />
          
          {/* After label */}    
          <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-sm font-semibold px-3 py-1.5 rounded-md">
            {beforeLabel}
          </div>
        </div>

        {/* Before image (clipped) */}
        <div 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            clipPath: `inset(0 0 0 ${sliderPosition}%)`
          }}
        >
          <img 
            src={beforeImageUrl} 
            alt={beforeLabel}
            className="w-full h-full object-contain"
            draggable={false}
          />
          
          {/* Before label - only show when slider is far enough left */}
          
          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-sm font-semibold px-3 py-1.5 rounded-md">
            {afterLabel}
          </div>
          
        </div>

        {/* Slider line and handle */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Slider handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md border-2 border-zinc-400 flex items-center justify-center pointer-events-auto cursor-ew-resize">
            <div className="w-3 h-3 bg-zinc-600 rounded-full"></div>
          </div>
        </div>
        
        {/* Debug button positioned inside the image container */}
        {debugImageUrl && onDebugClick && (
          <button
            onClick={onDebugClick}
            className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-opacity-80 transition-all z-30 shadow-lg"
            aria-label="Show generation debug view"
          >
            Debug
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

export default ImageComparisonSlider;