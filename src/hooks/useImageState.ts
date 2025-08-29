/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing image upload and mask state
 */
export const useImageState = () => {
  // Image file states
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [sceneImageFile, setSceneImageFile] = useState<File | null>(null);
  
  // Material marker position and scene mask states
  const [materialMarkerPosition, setMaterialMarkerPosition] = useState<{x: number, y: number} | null>(null);
  const [sceneMask, setSceneMask] = useState<string | null>(null);
  
  // Result state
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  // Create object URLs for display
  const productImageUrl = productImageFile ? URL.createObjectURL(productImageFile) : null;
  const sceneImageUrl = sceneImageFile ? URL.createObjectURL(sceneImageFile) : null;

  /**
   * Handles product image upload with state reset
   */
  const handleProductImageUpload = useCallback((file: File) => {
    setProductImageFile(file);
    setMaterialMarkerPosition(null); // Reset marker on new image
    setResultImageUrl(null); // Clear previous result
  }, []);

  /**
   * Handles scene image upload with state reset
   */
  const handleSceneImageUpload = useCallback((file: File) => {
    setSceneImageFile(file);
    setSceneMask(null); // Reset mask on new image
    setResultImageUrl(null); // Clear previous result
  }, []);

  /**
   * Updates material marker position
   */
  const handleMaterialMarkerUpdate = useCallback((markerPosition: {x: number, y: number} | null) => {
    setMaterialMarkerPosition(markerPosition);
  }, []);
  
  /**
   * Updates scene mask
   */
  const handleSceneMaskUpdate = useCallback((maskDataUrl: string | null) => {
    setSceneMask(maskDataUrl);
  }, []);

  /**
   * Clears product image and its mask
   */
  const clearProductImage = useCallback(() => {
    setProductImageFile(null);
    setMaterialMarkerPosition(null);
  }, []);

  /**
   * Clears scene image and its mask
   */
  const clearSceneImage = useCallback(() => {
    setSceneImageFile(null);
    setSceneMask(null);
  }, []);

  /**
   * Resets all image-related state
   */
  const resetImageState = useCallback(() => {
    setProductImageFile(null);
    setSceneImageFile(null);
    setMaterialMarkerPosition(null);
    setSceneMask(null);
    setResultImageUrl(null);
  }, []);

  // Clean up object URLs when files change
  useEffect(() => {
    return () => {
      if (productImageUrl) URL.revokeObjectURL(productImageUrl);
    };
  }, [productImageUrl]);

  useEffect(() => {
    return () => {
      if (sceneImageUrl) URL.revokeObjectURL(sceneImageUrl);
    };
  }, [sceneImageUrl]);

  return {
    // State
    productImageFile,
    sceneImageFile,
    materialMarkerPosition,
    sceneMask,
    resultImageUrl,
    productImageUrl,
    sceneImageUrl,
    // Actions
    handleProductImageUpload,
    handleSceneImageUpload,
    handleMaterialMarkerUpdate,
    handleSceneMaskUpdate,
    clearProductImage,
    clearSceneImage,
    resetImageState,
    setResultImageUrl,
    // Computed
    areImagesUploaded: !!(productImageFile && sceneImageFile),
    canGenerate: !!(materialMarkerPosition && sceneMask)
  };
};