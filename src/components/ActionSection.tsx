/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Spinner from './Spinner';

interface ActionSectionProps {
  isLoading: boolean;
  loadingMessage: string;
  areImagesUploaded: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onInstantStart: () => void;
  error?: string;
}

/**
 * Component for the central action area with loading, instructions, and generate button
 */
const ActionSection: React.FC<ActionSectionProps> = ({
  isLoading,
  loadingMessage,
  areImagesUploaded,
  canGenerate,
  onGenerate,
  onInstantStart,
  error
}) => {
  return (
    <div className="text-center mt-10 min-h-[8rem] flex flex-col justify-center items-center">
      {/* Error message display */}
      {error && (
        <div className="animate-fade-in p-4 rounded-lg max-w-2xl mx-auto bg-red-50 border border-red-200 mb-4">
          <div className={`text-sm ${error.includes('RECITATION') ? 'text-orange-700' : 'text-red-700'}`}>
            {error.split('\\n').map((line, index) => (
              <div key={index} className={`${
                line.startsWith('💡') || line.startsWith('•') 
                  ? 'text-left mt-1 pl-2' 
                  : 'text-center mb-1'
              }`}>
                {line || <br />}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Main content */}
      {isLoading ? (
        <div className="animate-fade-in">
          <Spinner />
          <p className="text-xl mt-4 text-zinc-600 transition-opacity duration-500">
            {loadingMessage}
          </p>
        </div>
      ) : areImagesUploaded ? (
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <p className="text-zinc-500">
            <span className="font-bold">Step 1:</span> Use the brush on the Product image to select a material.
            <br />
            <span className="font-bold">Step 2:</span> Use the brush on the Scene image to select the area to apply it to.
          </p>
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-bold py-4 px-10 rounded-lg text-xl transition-all transform hover:scale-105 shadow-lg disabled:shadow-none disabled:scale-100"
          >
            Generate
          </button>
        </div>
      ) : (
        <div>
          <p className="text-zinc-500 animate-fade-in">
            Upload a product image and a scene image to begin.
          </p>
          <p className="text-zinc-500 animate-fade-in mt-2">
            Or click{' '}
            <button
              onClick={onInstantStart}
              className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              here
            </button>
            {' '}for an instant start.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActionSection;