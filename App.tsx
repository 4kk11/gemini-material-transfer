/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import { applyMaterial } from './services/geminiService';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import DebugModal from './components/DebugModal';


const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
};

const loadingMessages = [
    "Extracting material characteristics with AI...",
    "Analyzing target area in the scene...",
    "Generating detailed material description...",
    "Processing scene area properties...",
    "Applying material with natural integration...",
    "Finalizing photorealistic result..."
];


const App: React.FC = () => {
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [sceneImageFile, setSceneImageFile] = useState<File | null>(null);
  const [materialMask, setMaterialMask] = useState<string | null>(null);
  const [sceneMask, setSceneMask] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const [materialDebugUrl, setMaterialDebugUrl] = useState<string | null>(null);
  const [sceneDebugUrl, setSceneDebugUrl] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
  const [materialDescription, setMaterialDescription] = useState<string | null>(null);
  const [sceneAreaDescription, setSceneAreaDescription] = useState<string | null>(null);
  const [isMaterialDebugModalOpen, setIsMaterialDebugModalOpen] = useState(false);
  const [isSceneDebugModalOpen, setIsSceneDebugModalOpen] = useState(false);
  const [isResultDebugModalOpen, setIsResultDebugModalOpen] = useState(false);

  const productImageUrl = productImageFile ? URL.createObjectURL(productImageFile) : null;
  const sceneImageUrl = sceneImageFile ? URL.createObjectURL(sceneImageFile) : null;
  

  const handleProductImageUpload = useCallback((file: File) => {
    setError(null);
    setProductImageFile(file);
    setMaterialMask(null); // Reset mask on new image
    setResultImageUrl(null); // Clear previous result
  }, []);

  const handleSceneImageUpload = useCallback((file: File) => {
    setError(null);
    setSceneImageFile(file);
    setSceneMask(null); // Reset mask on new image
    setResultImageUrl(null); // Clear previous result
  }, []);

  const handleMaterialMaskUpdate = useCallback((maskDataUrl: string | null) => {
    setMaterialMask(maskDataUrl);
  }, []);
  
  const handleSceneMaskUpdate = useCallback((maskDataUrl: string | null) => {
    setSceneMask(maskDataUrl);
  }, []);

  const handleInstantStart = useCallback(async () => {
    setError(null);
    setResultImageUrl(null);
    try {
      // Fetch the default images and their masks
      const [objectResponse, sceneResponse, objectMaskResponse, sceneMaskResponse] = await Promise.all([
        fetch('/assets/object.jpeg'),
        fetch('/assets/scene.jpeg'),
        fetch('/assets/object-mask.png'),
        fetch('/assets/scene-mask.png')
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

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Could not load default images. Details: ${errorMessage}`);
      console.error(err);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!productImageFile || !sceneImageFile || !materialMask || !sceneMask) {
      setError('Please select a material and a scene area before generating.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImageUrl(null);
    setDebugImageUrl(null);
    setMaterialDebugUrl(null);
    setSceneDebugUrl(null);
    setDebugPrompt(null);
    setMaterialDescription(null);
    setSceneAreaDescription(null);
    
    try {
      const { finalImageUrl, debugImageUrl, finalPrompt, materialDebugUrl, sceneDebugUrl, materialDescription, sceneAreaDescription } = await applyMaterial(
        productImageFile,
        materialMask,
        sceneImageFile,
        sceneMask
      );
      setResultImageUrl(finalImageUrl);
      setDebugImageUrl(debugImageUrl);
      setMaterialDebugUrl(materialDebugUrl || null);
      setSceneDebugUrl(sceneDebugUrl || null);
      setDebugPrompt(finalPrompt);
      setMaterialDescription(materialDescription || null);
      setSceneAreaDescription(sceneAreaDescription || null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate the image. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [productImageFile, sceneImageFile, materialMask, sceneMask]);


  const handleReset = useCallback(() => {
    setProductImageFile(null);
    setSceneImageFile(null);
    setMaterialMask(null);
    setSceneMask(null);
    setResultImageUrl(null);
    setError(null);
    setIsLoading(false);
    setDebugImageUrl(null);
    setMaterialDebugUrl(null);
    setSceneDebugUrl(null);
    setDebugPrompt(null);
    setMaterialDescription(null);
    setSceneAreaDescription(null);
    setIsMaterialDebugModalOpen(false);
    setIsSceneDebugModalOpen(false);
    setIsResultDebugModalOpen(false);
  }, []);
  
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
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
        setLoadingMessageIndex(0); // Reset on start
        interval = setInterval(() => {
            setLoadingMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 3000);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-50 border border-red-200 p-8 rounded-lg max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold mb-4 text-red-800">An Error Occurred</h2>
            <p className="text-lg text-red-700 mb-6">{error}</p>
            <button
                onClick={handleReset}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    const areImagesUploaded = productImageFile && sceneImageFile;

    return (
      <div className="w-full max-w-6xl mx-auto animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-center mb-5 text-zinc-800">Product (Material Source)</h2>
            <ImageUploader 
              id="product-uploader"
              onFileSelect={handleProductImageUpload}
              imageUrl={productImageUrl}
              maskUrl={materialMask}
              onMaskUpdate={handleMaterialMaskUpdate}
              showDebugButton={!!materialDebugUrl && !isLoading}
              onDebugClick={() => setIsMaterialDebugModalOpen(true)}
            />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-center mb-5 text-zinc-800">Scene (Target)</h2>
            <ImageUploader 
              id="scene-uploader"
              onFileSelect={handleSceneImageUpload}
              imageUrl={sceneImageUrl}
              maskUrl={sceneMask}
              onMaskUpdate={handleSceneMaskUpdate}
              showDebugButton={!!sceneDebugUrl && !isLoading}
              onDebugClick={() => setIsSceneDebugModalOpen(true)}
            />
          </div>
        </div>
        <div className="text-center mt-10 min-h-[8rem] flex flex-col justify-center items-center">
          {isLoading ? (
            <div className="animate-fade-in">
              <Spinner />
              <p className="text-xl mt-4 text-zinc-600 transition-opacity duration-500">{loadingMessages[loadingMessageIndex]}</p>
            </div>
          ) : areImagesUploaded ? (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <p className="text-zinc-500">
                    <span className="font-bold">Step 1:</span> Use the brush on the Product image to select a material.
                    <br />
                    <span className="font-bold">Step 2:</span> Use the brush on the Scene image to select the area to apply it to.
                </p>
                <button
                    onClick={handleGenerate}
                    disabled={!materialMask || !sceneMask}
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
                  onClick={handleInstantStart}
                  className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
                >
                  here
                </button>
                {' '}for an instant start.
              </p>
            </div>
          )}
        </div>
        
        {resultImageUrl && !isLoading && (
            <div className="mt-12 animate-fade-in">
                <div className="text-center mb-6">
                    <h2 className="text-4xl font-extrabold text-zinc-800">Generated Result</h2>
                </div>
                <div className="w-full max-w-4xl mx-auto bg-zinc-100 border-2 border-zinc-200 rounded-lg overflow-hidden shadow-lg relative">
                    <img src={resultImageUrl} alt="Generated scene" className="w-full h-full object-contain" />
                    {debugImageUrl && (
                        <button
                            onClick={() => setIsResultDebugModalOpen(true)}
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
                        onClick={handleReset}
                        className="bg-zinc-500 hover:bg-zinc-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-md"
                    >
                        Start Over
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-white text-zinc-800 flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col items-center gap-8 w-full">
        <Header />
        <main className="w-full">
          {renderContent()}
        </main>
      </div>
      <DebugModal 
        isOpen={isMaterialDebugModalOpen} 
        onClose={() => setIsMaterialDebugModalOpen(false)}
        imageUrl={materialDebugUrl}
        title="Material Extraction Debug"
        description="The material area marked with red border for AI analysis"
        showPromptSection={false}
        aiResponse={materialDescription}
        aiResponseTitle="AI Material Analysis"
      />
      <DebugModal 
        isOpen={isSceneDebugModalOpen} 
        onClose={() => setIsSceneDebugModalOpen(false)}
        imageUrl={sceneDebugUrl}
        title="Target Area Detection Debug"
        description="The target area marked with red border for material application"
        showPromptSection={false}
        aiResponse={sceneAreaDescription}
        aiResponseTitle="AI Scene Area Analysis"
      />
      <DebugModal 
        isOpen={isResultDebugModalOpen} 
        onClose={() => setIsResultDebugModalOpen(false)}
        imageUrl={resultImageUrl}
        title="Generation Result Debug"
        description="The generated result image and the prompt used for generation"
        prompt={debugPrompt}
      />
    </div>
  );
};

export default App;