/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

/**
 * Custom hook for managing UI state including loading, errors, and debug modals
 */
export const useUIState = () => {
  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProgressMessage, setCurrentProgressMessage] = useState<string>('Processing...');

  // Debug modal states
  const [isMaterialDebugModalOpen, setIsMaterialDebugModalOpen] = useState(false);
  const [isSceneDebugModalOpen, setIsSceneDebugModalOpen] = useState(false);
  const [isResultDebugModalOpen, setIsResultDebugModalOpen] = useState(false);

  // Debug data states
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const [materialDebugUrl, setMaterialDebugUrl] = useState<string | null>(null);
  const [sceneDebugUrl, setSceneDebugUrl] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
  const [seamlessTextureUrl, setSeamlessTextureUrl] = useState<string | null>(null);
  const [materialInputImageUrl, setMaterialInputImageUrl] = useState<string | null>(null);
  const [seamlessTexturePrompt, setSeamlessTexturePrompt] = useState<string | null>(null);
  const [resultDebugInputImageUrl, setResultDebugInputImageUrl] = useState<string | null>(null);
  const [sceneAreaDescription, setSceneAreaDescription] = useState<string | null>(null);

  /**
   * Sets loading state and clears error
   */
  const startLoading = useCallback((initialMessage?: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentProgressMessage(initialMessage || 'Processing...');
  }, []);

  /**
   * Updates the current progress message
   */
  const updateProgress = useCallback((message: string) => {
    setCurrentProgressMessage(message);
  }, []);

  /**
   * Stops loading
   */
  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  /**
   * Sets error message and stops loading
   */
  const setErrorMessage = useCallback((message: string) => {
    setError(message);
    setIsLoading(false);
  }, []);

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clears all debug data
   */
  const clearDebugData = useCallback(() => {
    setDebugImageUrl(null);
    setMaterialDebugUrl(null);
    setSceneDebugUrl(null);
    setDebugPrompt(null);
    setSeamlessTextureUrl(null);
    setMaterialInputImageUrl(null);
    setSeamlessTexturePrompt(null);
    setResultDebugInputImageUrl(null);
    setSceneAreaDescription(null);
  }, []);

  /**
   * Sets debug data from generation response
   */
  const setDebugData = useCallback((data: {
    debugImageUrl?: string;
    materialDebugUrl?: string;
    sceneDebugUrl?: string;
    finalPrompt?: string;
    seamlessTextureUrl?: string;
    materialInputImageUrl?: string;
    seamlessTexturePrompt?: string;
    resultDebugInputImageUrl?: string;
  }) => {
    setDebugImageUrl(data.debugImageUrl || null);
    setMaterialDebugUrl(data.materialDebugUrl || null);
    setSceneDebugUrl(data.sceneDebugUrl || null);
    setDebugPrompt(data.finalPrompt || null);
    setSeamlessTextureUrl(data.seamlessTextureUrl || null);
    setMaterialInputImageUrl(data.materialInputImageUrl || null);
    setSeamlessTexturePrompt(data.seamlessTexturePrompt || null);
    setResultDebugInputImageUrl(data.resultDebugInputImageUrl || null);
    setSceneAreaDescription(null);
  }, []);

  /**
   * Closes all debug modals
   */
  const closeAllDebugModals = useCallback(() => {
    setIsMaterialDebugModalOpen(false);
    setIsSceneDebugModalOpen(false);
    setIsResultDebugModalOpen(false);
  }, []);

  /**
   * Resets all UI state
   */
  const resetUIState = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setCurrentProgressMessage('Processing...');
    closeAllDebugModals();
    clearDebugData();
  }, [closeAllDebugModals, clearDebugData]);


  return {
    // Loading and error state
    isLoading,
    error,
    loadingMessage: currentProgressMessage,
    
    // Debug modal state
    isMaterialDebugModalOpen,
    isSceneDebugModalOpen,
    isResultDebugModalOpen,
    
    // Debug data
    debugImageUrl,
    materialDebugUrl,
    sceneDebugUrl,
    debugPrompt,
    seamlessTextureUrl,
    materialInputImageUrl,
    seamlessTexturePrompt,
    resultDebugInputImageUrl,
    sceneAreaDescription,
    
    // Loading actions
    startLoading,
    stopLoading,
    setErrorMessage,
    clearError,
    updateProgress,
    
    // Debug actions
    setIsMaterialDebugModalOpen,
    setIsSceneDebugModalOpen,
    setIsResultDebugModalOpen,
    setDebugData,
    clearDebugData,
    closeAllDebugModals,
    
    // Reset
    resetUIState,
    
    // Computed
    hasDebugData: !!(debugImageUrl || materialDebugUrl || sceneDebugUrl),
    showMaterialDebug: !!(materialDebugUrl && !isLoading),
    showSceneDebug: !!(sceneDebugUrl && !isLoading)
  };
};