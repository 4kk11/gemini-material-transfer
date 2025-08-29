/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  materialImageUrl?: string | null;
  prompt: string | null;
  title?: string;
  description?: string;
  showMaterialSection?: boolean;
  showPromptSection?: boolean;
  aiResponse?: string | null;
  aiResponseTitle?: string;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DebugModal: React.FC<DebugModalProps> = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  materialImageUrl, 
  prompt, 
  title = "Debug View",
  description,
  showMaterialSection = false,
  showPromptSection = true,
  aiResponse,
  aiResponseTitle = "AI Analysis Response"
}) => {
  if (!isOpen || !imageUrl) {
    return null;
  }

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl p-6 md:p-8 relative transform transition-all flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={handleModalContentClick}
        role="document"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 transition-colors z-10"
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        <div className="text-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-zinc-100">{title}</h2>
          {description && <p className="text-zinc-300 mt-1">{description}</p>}
        </div>
        
        <div className="flex flex-col gap-4 overflow-y-auto">
          {materialImageUrl && showMaterialSection && (
            <div>
              <h3 className="text-lg font-bold text-zinc-100 mb-2">Input Image</h3>
              <p className="text-zinc-300 mb-2">The input image used for processing.</p>
              <div className="rounded-lg overflow-hidden bg-zinc-700">
                  <img src={materialImageUrl} alt="Debug view of marked material" className="w-full h-full object-contain" />
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Output Image</h3>
            <p className="text-zinc-300 mb-2">The AI-generated output image.</p>
            <div className="rounded-lg overflow-hidden bg-zinc-700">
                <img src={imageUrl} alt="Generated output" className="w-full h-full object-contain" />
            </div>
          </div>
          
          {aiResponse && (
            <div>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">{aiResponseTitle}</h3>
                <pre className="bg-blue-900/20 border border-blue-800 text-zinc-200 p-4 rounded-lg text-xs whitespace-pre-wrap">
                    <code>{aiResponse}</code>
                </pre>
            </div>
          )}
          
          {prompt && showPromptSection && (
            <div>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">Input Prompt</h3>
                <pre className="bg-zinc-700 text-zinc-200 p-4 rounded-lg text-xs whitespace-pre-wrap">
                    <code>{prompt}</code>
                </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugModal;
