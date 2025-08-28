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
  
  // Mask states
  const [materialMask, setMaterialMask] = useState<string | null>(null);
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
    setMaterialMask(null); // Reset mask on new image
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
   * Updates material mask
   */
  const handleMaterialMaskUpdate = useCallback((maskDataUrl: string | null) => {
    setMaterialMask(maskDataUrl);
  }, []);
  
  /**
   * Updates scene mask
   */
  const handleSceneMaskUpdate = useCallback((maskDataUrl: string | null) => {
    setSceneMask(maskDataUrl);
  }, []);


  /**
   * Resets all image-related state
   */
  const resetImageState = useCallback(() => {
    setProductImageFile(null);
    setSceneImageFile(null);
    setMaterialMask(null);
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
    materialMask,
    sceneMask,
    resultImageUrl,
    productImageUrl,
    sceneImageUrl,
    // Actions
    handleProductImageUpload,
    handleSceneImageUpload,
    handleMaterialMaskUpdate,
    handleSceneMaskUpdate,
    resetImageState,
    setResultImageUrl,
    // Computed
    areImagesUploaded: !!(productImageFile && sceneImageFile),
    canGenerate: !!(materialMask && sceneMask)
  };
};