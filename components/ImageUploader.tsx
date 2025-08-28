/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useCallback, useRef, useState, useEffect } from 'react';

interface ImageUploaderProps {
  id: string;
  label?: string;
  onFileSelect: (file: File) => void;
  imageUrl: string | null;
  maskUrl?: string | null;
  onMaskUpdate?: (maskDataUrl: string | null) => void;
  showDebugButton?: boolean;
  onDebugClick?: () => void;
}

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const WarningIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onFileSelect, imageUrl, maskUrl, onMaskUpdate, showDebugButton, onDebugClick }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setFileTypeError(null);
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageUrl) return;

    const updateCanvas = () => {
        const { naturalWidth, naturalHeight } = img;
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (maskUrl) {
            const maskImage = new Image();
            maskImage.onload = () => {
                ctx.drawImage(maskImage, 0, 0);
            };
            maskImage.src = maskUrl;
        }
    };
    
    if (img.complete) {
        updateCanvas();
    } else {
        img.onload = updateCanvas;
    }
  }, [imageUrl, maskUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setFileTypeError('For best results, please use PNG, JPG, or JPEG formats.');
      } else {
        setFileTypeError(null);
      }
      onFileSelect(file);
    }
  };
  
  const getScaledCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imgRef.current;
    if (!canvas || !container || !img) return null;

    const containerRect = container.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;

    // Calculate actual displayed image size with object-contain
    const imgAspect = naturalWidth / naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    let actualDisplayWidth, actualDisplayHeight;
    
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
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'white';
    // Calculate actual display width for consistent brush size
    const { naturalWidth, naturalHeight } = imgRef.current!;
    const containerRect = containerRef.current!.getBoundingClientRect();
    const imgAspect = naturalWidth / naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    const actualDisplayWidth = imgAspect > containerAspect 
      ? containerRect.width 
      : containerRect.height * imgAspect;
    
    ctx.lineWidth = brushSize * (canvasRef.current!.width / actualDisplayWidth);

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
    if (isDrawing && onMaskUpdate && canvasRef.current) {
        onMaskUpdate(canvasRef.current.toDataURL());
    }
    setIsDrawing(false);
    lastPos.current = null;
  };
  
  const handleClearMask = (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        onMaskUpdate?.(null);
    }
  }

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(false);

      const file = event.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
          const allowedTypes = ['image/jpeg', 'image/png'];
          if (!allowedTypes.includes(file.type)) {
              setFileTypeError('For best results, please use PNG, JPG, or JPEG formats.');
          } else {
              setFileTypeError(null);
          }
          onFileSelect(file);
      }
  }, [onFileSelect]);
  
  const uploaderClasses = `w-full aspect-video bg-zinc-100 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
      isDraggingOver ? 'border-blue-500 bg-blue-50'
    : imageUrl ? 'border-zinc-400'
    : 'border-zinc-300 hover:border-blue-500 cursor-pointer'
  }`;

  return (
    <div className="flex flex-col items-center w-full">
      {label && <h3 className="text-xl font-semibold mb-4 text-zinc-700">{label}</h3>}
      <div
        ref={containerRef}
        className={uploaderClasses}
        onClick={!imageUrl ? () => inputRef.current?.click() : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-dropzone-id={id}
        onMouseDown={imageUrl ? startDrawing : undefined}
        onMouseMove={imageUrl ? draw : undefined}
        onMouseUp={imageUrl ? stopDrawing : undefined}
        onMouseLeave={imageUrl ? stopDrawing : undefined}
        onTouchStart={imageUrl ? startDrawing : undefined}
        onTouchMove={imageUrl ? draw : undefined}
        onTouchEnd={imageUrl ? stopDrawing : undefined}
      >
        <input
          type="file"
          id={id}
          ref={inputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg"
          className="hidden"
        />
        {imageUrl ? (
          <>
            <img 
              ref={imgRef}
              src={imageUrl} 
              alt={label || 'Uploaded content'} 
              className="w-full h-full object-contain pointer-events-none"
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none opacity-50"
              style={{ mixBlendMode: 'screen' }}
            />
            {onMaskUpdate && (
                <>
                    <div 
                        className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2 z-30"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span>Brush:</span>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            value={brushSize}
                            onChange={(e) => {
                                e.stopPropagation();
                                setBrushSize(Number(e.target.value));
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-16 h-1 bg-gray-300 rounded-full appearance-none cursor-pointer"
                        />
                        <span className="text-xs">{brushSize}</span>
                    </div>
                    {maskUrl && (
                        <button
                            onClick={handleClearMask}
                            className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-opacity-80 transition-all z-20 shadow-lg"
                            aria-label="Clear mask"
                        >
                            Clear Mask
                        </button>
                    )}
                </>
            )}
            {showDebugButton && onDebugClick && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDebugClick();
                    }}
                    className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-opacity-80 transition-all z-20 shadow-lg"
                    aria-label="Show debug view"
                >
                    Debug
                </button>
            )}
          </>
        ) : (
          <div className="text-center text-zinc-500 p-4">
            <UploadIcon />
            <p>Click to upload or drag & drop</p>
          </div>
        )}
      </div>
      {fileTypeError && (
        <div className="w-full mt-2 text-sm text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-lg p-3 flex items-center animate-fade-in" role="alert">
            <WarningIcon />
            <span>{fileTypeError}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;