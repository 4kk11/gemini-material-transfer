/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { applyMaterial } from '../services/geminiService';

/**
 * Hook for managing material transfer operations
 */
export const useMaterialTransfer = () => {
  /**
   * Executes the material transfer process
   */
  const executeTransfer = useCallback(async (
    productImageFile: File,
    materialMask: string,
    sceneImageFile: File,
    sceneMask: string
  ) => {
    const result = await applyMaterial(
      productImageFile,
      materialMask,
      sceneImageFile,
      sceneMask
    );
    
    return result;
  }, []);

  /**
   * Handles instant start with error handling
   */
  const handleInstantStart = useCallback(async (loadDefaultAssets: () => Promise<void>) => {
    try {
      await loadDefaultAssets();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      throw new Error(`Could not load default images. Details: ${errorMessage}`);
    }
  }, []);

  /**
   * Handles the complete generation process with error handling
   */
  const handleGenerate = useCallback(async (
    productImageFile: File | null,
    sceneImageFile: File | null,
    materialMask: string | null,
    sceneMask: string | null
  ) => {
    // Validation
    if (!productImageFile || !sceneImageFile || !materialMask || !sceneMask) {
      throw new Error('Please select a material and a scene area before generating.');
    }

    try {
      const result = await executeTransfer(
        productImageFile,
        materialMask,
        sceneImageFile,
        sceneMask
      );
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      throw new Error(`Failed to generate the image. ${errorMessage}`);
    }
  }, [executeTransfer]);

  return {
    executeTransfer,
    handleInstantStart,
    handleGenerate
  };
};