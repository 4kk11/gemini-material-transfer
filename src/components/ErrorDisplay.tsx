/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ErrorDisplayProps {
  error: string;
  onReset: () => void;
}

/**
 * Component for displaying error messages with retry functionality
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onReset }) => {
  const isRecitationError = error.includes('RECITATION');
  
  return (
    <div className={`text-center animate-fade-in p-8 rounded-lg max-w-3xl mx-auto ${
      isRecitationError 
        ? 'bg-orange-50 border border-orange-200' 
        : 'bg-red-50 border border-red-200'
    }`}>
      {isRecitationError ? (
        <div className="mb-6">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-4 text-orange-800">RECITATION Error</h2>
        </div>
      ) : (
        <h2 className="text-3xl font-extrabold mb-4 text-red-800">An Error Occurred</h2>
      )}
      
      <div className={`mb-6 ${
        isRecitationError ? 'text-orange-700' : 'text-red-700'
      }`}>
        {error.split('\\n').map((line, index) => (
          <div key={index} className={`${
            line.startsWith('💡') || line.startsWith('•') 
              ? 'text-left mt-2 pl-4' 
              : 'text-center mb-2'
          }`}>
            {line || <br />}
          </div>
        ))}
      </div>
      
      <div className="flex gap-4 justify-center">
        <button
          onClick={onReset}
          className={`font-bold py-3 px-8 rounded-lg text-lg transition-colors ${
            isRecitationError
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isRecitationError ? 'Try Different Image' : 'Try Again'}
        </button>
        
        {isRecitationError && (
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Reset Page
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;