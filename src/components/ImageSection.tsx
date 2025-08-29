/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import MarkerImageUploader from './MarkerImageUploader';
import BrushImageUploader from './BrushImageUploader';

interface ImageSectionProps {
  // Product image props
  productImageUrl: string | null;
  materialMarkerPosition: {x: number, y: number} | null;
  onProductImageUpload: (file: File) => void;
  onMaterialMarkerUpdate: (markerPosition: {x: number, y: number} | null) => void;
  onProductImageClear: () => void;
  showMaterialDebug: boolean;
  onMaterialDebugClick: () => void;
  
  // Scene image props
  sceneImageUrl: string | null;
  sceneMask: string | null;
  onSceneImageUpload: (file: File) => void;
  onSceneMaskUpdate: (maskDataUrl: string | null) => void;
  onSceneImageClear: () => void;
  showSceneDebug: boolean;
  onSceneDebugClick: () => void;
  
  isLoading: boolean;
}

/**
 * Component containing both product and scene image upload sections
 */
const ImageSection: React.FC<ImageSectionProps> = ({
  productImageUrl,
  materialMarkerPosition,
  onProductImageUpload,
  onMaterialMarkerUpdate,
  onProductImageClear,
  showMaterialDebug,
  onMaterialDebugClick,
  sceneImageUrl,
  sceneMask,
  onSceneImageUpload,
  onSceneMaskUpdate,
  onSceneImageClear,
  showSceneDebug,
  onSceneDebugClick,
  isLoading
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="flex flex-col">
        <h2 className="text-2xl font-extrabold text-center mb-5 text-zinc-800">
          Material Source
        </h2>
        <MarkerImageUploader 
          id="product-uploader"
          onFileSelect={onProductImageUpload}
          imageUrl={productImageUrl}
          onMarkerUpdate={onMaterialMarkerUpdate}
          onClearImage={onProductImageClear}
          showDebugButton={showMaterialDebug}
          onDebugClick={onMaterialDebugClick}
        />
      </div>
      
      <div className="flex flex-col">
        <h2 className="text-2xl font-extrabold text-center mb-5 text-zinc-800">
          Target
        </h2>
        <BrushImageUploader 
          id="scene-uploader"
          onFileSelect={onSceneImageUpload}
          imageUrl={sceneImageUrl}
          maskUrl={sceneMask}
          onMaskUpdate={onSceneMaskUpdate}
          onClearImage={onSceneImageClear}
          showDebugButton={showSceneDebug}
          onDebugClick={onSceneDebugClick}
        />
      </div>
    </div>
  );
};

export default ImageSection;