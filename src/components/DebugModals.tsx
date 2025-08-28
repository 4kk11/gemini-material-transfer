/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DebugModal from './DebugModal';

interface DebugModalsProps {
  // Material debug modal
  isMaterialDebugModalOpen: boolean;
  onCloseMaterialDebugModal: () => void;
  materialDebugUrl: string | null;
  materialDescription: string | null;
  
  // Scene debug modal
  isSceneDebugModalOpen: boolean;
  onCloseSceneDebugModal: () => void;
  sceneDebugUrl: string | null;
  sceneAreaDescription: string | null;
  
  // Result debug modal
  isResultDebugModalOpen: boolean;
  onCloseResultDebugModal: () => void;
  resultImageUrl: string | null;
  debugPrompt: string | null;
}

/**
 * Component grouping all debug modals for the application
 */
const DebugModals: React.FC<DebugModalsProps> = ({
  isMaterialDebugModalOpen,
  onCloseMaterialDebugModal,
  materialDebugUrl,
  materialDescription,
  isSceneDebugModalOpen,
  onCloseSceneDebugModal,
  sceneDebugUrl,
  sceneAreaDescription,
  isResultDebugModalOpen,
  onCloseResultDebugModal,
  resultImageUrl,
  debugPrompt
}) => {
  return (
    <>
      <DebugModal 
        isOpen={isMaterialDebugModalOpen} 
        onClose={onCloseMaterialDebugModal}
        imageUrl={materialDebugUrl}
        title="Material Extraction Debug"
        description="The material area marked with red border for AI analysis"
        showPromptSection={false}
        aiResponse={materialDescription}
        aiResponseTitle="AI Material Analysis"
      />
      
      <DebugModal 
        isOpen={isSceneDebugModalOpen} 
        onClose={onCloseSceneDebugModal}
        imageUrl={sceneDebugUrl}
        title="Target Area Detection Debug"
        description="The target area marked with red border for material application"
        showPromptSection={false}
        aiResponse={sceneAreaDescription}
        aiResponseTitle="AI Scene Area Analysis"
      />
      
      <DebugModal 
        isOpen={isResultDebugModalOpen} 
        onClose={onCloseResultDebugModal}
        imageUrl={resultImageUrl}
        title="Generation Result Debug"
        description="The generated result image and the prompt used for generation"
        prompt={debugPrompt}
      />
    </>
  );
};

export default DebugModals;