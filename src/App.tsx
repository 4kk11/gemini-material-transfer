/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';

// Components
import Header from './components/Header';
import ImageSection from './components/ImageSection';
import ActionSection from './components/ActionSection';
import ResultSection from './components/ResultSection';
import DebugModals from './components/DebugModals';

// Custom hooks
import { useImageState } from './hooks/useImageState';
import { useUIState } from './hooks/useUIState';
import { applyMaterial } from './services/geminiService';
import { RecitationError } from './services/aiService';

/**
 * Main application component for material transfer functionality
 * 
 * This component orchestrates the entire material transfer workflow:
 * 1. Image upload and mask creation
 * 2. Material extraction and scene analysis
 * 3. AI-powered material application
 * 4. Result display and debugging
 */
const App: React.FC = () => {
  // Custom hooks for state management
  const imageState = useImageState();
  const uiState = useUIState();

  /**
   * Handles the instant start functionality - clears any errors and resets to upload state
   */
  const onInstantStart = useCallback(() => {
    uiState.clearError();
    imageState.setResultImageUrl(null);
    imageState.resetImageState();
  }, [imageState, uiState]);

  /**
   * Handles the material generation process with complete error handling
   */
  const onGenerate = useCallback(async () => {
    // Validation
    if (!imageState.productImageFile || !imageState.sceneImageFile || !imageState.materialMarkerPosition || !imageState.sceneMask) {
      uiState.setErrorMessage('Please select a material and a scene area before generating.');
      return;
    }

    uiState.startLoading();
    imageState.setResultImageUrl(null);
    uiState.clearDebugData();
    
    try {
      const result = await applyMaterial(
        imageState.productImageFile,
        imageState.materialMarkerPosition,
        imageState.sceneImageFile,
        imageState.sceneMask,
        uiState.updateProgress
      );
      
      // Update result and debug data
      imageState.setResultImageUrl(result.finalImageUrl);
      uiState.setDebugData({
        debugImageUrl: result.debugImageUrl,
        materialDebugUrl: result.materialDebugUrl,
        sceneDebugUrl: result.sceneDebugUrl,
        finalPrompt: result.finalPrompt,
        seamlessTextureUrl: result.seamlessTextureUrl,
        materialInputImageUrl: result.materialInputImageUrl,
        seamlessTexturePrompt: result.seamlessTexturePrompt,
        resultDebugInputImageUrl: result.resultDebugInputImageUrl
      });

    } catch (err) {
      let errorMessage: string;
      
      if (err instanceof RecitationError) {
        // Special handling for RECITATION errors with helpful advice
        errorMessage = `🚫 RECITATION Error\n\n${err.message}\n\n💡 Solutions:\n• Try more specific and detailed instructions\n• Use different images or materials\n• Change image composition or angle\n• Wait a moment and try again`;
      } else {
        errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        errorMessage = `Failed to generate the image. ${errorMessage}`;
      }
      
      uiState.setErrorMessage(errorMessage);
      console.error(err);
    } finally {
      uiState.stopLoading();
    }
  }, [imageState, uiState]);


  /**
   * Handles complete application reset
   */
  const onReset = useCallback(() => {
    imageState.resetImageState();
    uiState.resetUIState();
  }, [imageState, uiState]);

  /**
   * Handles product image upload with error clearing
   */
  const onProductImageUpload = useCallback((file: File) => {
    uiState.clearError();
    imageState.handleProductImageUpload(file);
  }, [imageState, uiState]);

  /**
   * Handles scene image upload with error clearing
   */
  const onSceneImageUpload = useCallback((file: File) => {
    uiState.clearError();
    imageState.handleSceneImageUpload(file);
  }, [imageState, uiState]);

  /**
   * Handles product image clearing
   */
  const onProductImageClear = useCallback(() => {
    uiState.clearError();
    imageState.clearProductImage();
  }, [imageState, uiState]);

  /**
   * Handles scene image clearing
   */
  const onSceneImageClear = useCallback(() => {
    uiState.clearError();
    imageState.clearSceneImage();
  }, [imageState, uiState]);

  /**
   * Renders the main content based on application state
   */
  const renderContent = () => {
    return (
      <div className="w-full max-w-6xl mx-auto animate-fade-in">
        {/* Image upload section */}
        <ImageSection
          productImageUrl={imageState.productImageUrl}
          materialMarkerPosition={imageState.materialMarkerPosition}
          onProductImageUpload={onProductImageUpload}
          onMaterialMarkerUpdate={imageState.handleMaterialMarkerUpdate}
          onProductImageClear={onProductImageClear}
          showMaterialDebug={uiState.showMaterialDebug}
          onMaterialDebugClick={() => uiState.setIsMaterialDebugModalOpen(true)}
          sceneImageUrl={imageState.sceneImageUrl}
          sceneMask={imageState.sceneMask}
          onSceneImageUpload={onSceneImageUpload}
          onSceneMaskUpdate={imageState.handleSceneMaskUpdate}
          onSceneImageClear={onSceneImageClear}
          showSceneDebug={uiState.showSceneDebug}
          onSceneDebugClick={() => uiState.setIsSceneDebugModalOpen(true)}
          isLoading={uiState.isLoading}
        />

        {/* Action section with loading/generate button or error display */}
        <ActionSection
          isLoading={uiState.isLoading}
          loadingMessage={uiState.loadingMessage}
          areImagesUploaded={imageState.areImagesUploaded}
          canGenerate={imageState.canGenerate}
          onGenerate={onGenerate}
          onInstantStart={onInstantStart}
          error={uiState.error}
        />

        {/* Result display section */}
        {imageState.resultImageUrl && !uiState.isLoading && (
          <ResultSection
            resultImageUrl={imageState.resultImageUrl}
            debugImageUrl={uiState.debugImageUrl}
            onDebugClick={() => uiState.setIsResultDebugModalOpen(true)}
            onReset={onReset}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col items-center gap-8 w-full">
        <Header />
        <main className="w-full">
          {renderContent()}
        </main>
      </div>

      {/* Debug modals */}
      <DebugModals
        isMaterialDebugModalOpen={uiState.isMaterialDebugModalOpen}
        onCloseMaterialDebugModal={() => uiState.setIsMaterialDebugModalOpen(false)}
        materialDebugUrl={uiState.materialDebugUrl}
        seamlessTextureUrl={uiState.seamlessTextureUrl}
        materialInputImageUrl={uiState.materialInputImageUrl}
        seamlessTexturePrompt={uiState.seamlessTexturePrompt}
        isSceneDebugModalOpen={uiState.isSceneDebugModalOpen}
        onCloseSceneDebugModal={() => uiState.setIsSceneDebugModalOpen(false)}
        sceneDebugUrl={uiState.sceneDebugUrl}
        sceneAreaDescription={uiState.sceneAreaDescription}
        isResultDebugModalOpen={uiState.isResultDebugModalOpen}
        onCloseResultDebugModal={() => uiState.setIsResultDebugModalOpen(false)}
        resultImageUrl={imageState.resultImageUrl}
        resultDebugInputImageUrl={uiState.resultDebugInputImageUrl}
        debugPrompt={uiState.debugPrompt}
      />
    </div>
  );
};

export default App;