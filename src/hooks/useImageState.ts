/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { blobToDataURL } from '../utils/fileUtils';
import { DEFAULT_ASSETS } from '../utils/constants';

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
   * Loads default images and masks for instant start
   */
  const loadDefaultAssets = useCallback(async () => {
    // Fetch the default images and their masks
    const [objectResponse, sceneResponse, objectMaskResponse, sceneMaskResponse] = await Promise.all([
      fetch(DEFAULT_ASSETS.OBJECT_IMAGE),
      fetch(DEFAULT_ASSETS.SCENE_IMAGE),
      fetch(DEFAULT_ASSETS.OBJECT_MASK),
      fetch(DEFAULT_ASSETS.SCENE_MASK)
    ]);

    if (!objectResponse.ok || !sceneResponse.ok || !objectMaskResponse.ok || !sceneMaskResponse.ok) {
      throw new Error('Failed to load default assets');
    }

    // Convert to blobs
    const [objectBlob, sceneBlob, objectMaskBlob, sceneMaskBlob] = await Promise.all([
      objectResponse.blob(),
      sceneResponse.blob(),
      objectMaskResponse.blob(),
      sceneMaskResponse.blob(),
    ]);

    const objectFile = new File([objectBlob], 'material.jpeg', { type: 'image/jpeg' });
    const sceneFile = new File([sceneBlob], 'scene.jpeg', { type: 'image/jpeg' });
    
    const [materialMaskDataUrl, sceneMaskDataUrl] = await Promise.all([
      blobToDataURL(objectMaskBlob),
      blobToDataURL(sceneMaskBlob),
    ]);

    // Update state with the new files and masks
    setProductImageFile(objectFile);
    setSceneImageFile(sceneFile);
    setMaterialMask(materialMaskDataUrl);
    setSceneMask(sceneMaskDataUrl);
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
    loadDefaultAssets,
    resetImageState,
    setResultImageUrl,
    // Computed
    areImagesUploaded: !!(productImageFile && sceneImageFile),
    canGenerate: !!(materialMask && sceneMask)
  };
};