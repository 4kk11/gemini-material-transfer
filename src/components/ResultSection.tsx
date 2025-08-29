/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ResultSectionProps {
  resultImageUrl: string;
  debugImageUrl: string | null;
  onDebugClick: () => void;
  onReset: () => void;
}

/**
 * Component for displaying the generated result with download and reset options
 */
const ResultSection: React.FC<ResultSectionProps> = ({
  resultImageUrl,
  debugImageUrl,
  onDebugClick,
  onReset
}) => {
  return (
    <div className="mt-12 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-extrabold text-zinc-100">Generated Result</h2>
      </div>
      
      <div className="w-full max-w-4xl mx-auto bg-zinc-800 border-2 border-zinc-700 rounded-lg overflow-hidden shadow-lg relative">
        <img 
          src={resultImageUrl} 
          alt="Generated scene" 
          className="w-full h-full object-contain" 
        />
        
        {debugImageUrl && (
          <button
            onClick={onDebugClick}
            className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-opacity-80 transition-all z-20 shadow-lg"
            aria-label="Show generation debug view"
          >
            Debug
          </button>
        )}
      </div>
      
      <div className="text-center mt-6 flex justify-center items-center gap-4">
        <a
          href={resultImageUrl}
          download={`generated-image-${Date.now()}.jpeg`}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-md"
        >
          Download
        </a>
        <button
          onClick={onReset}
          className="bg-zinc-500 hover:bg-zinc-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-md"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

export default ResultSection;