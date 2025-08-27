/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper to get intrinsic image dimensions from a File object
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper to crop a square image back to an original aspect ratio, removing padding.
const cropToOriginalAspectRatio = (
    imageDataUrl: string,
    originalWidth: number,
    originalHeight: number,
    targetDimension: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            const aspectRatio = originalWidth / originalHeight;
            let contentWidth, contentHeight;
            if (aspectRatio > 1) { // Landscape
                contentWidth = targetDimension;
                contentHeight = targetDimension / aspectRatio;
            } else { // Portrait or square
                contentHeight = targetDimension;
                contentWidth = targetDimension * aspectRatio;
            }

            const x = (targetDimension - contentWidth) / 2;
            const y = (targetDimension - contentHeight) / 2;

            const canvas = document.createElement('canvas');
            canvas.width = contentWidth;
            canvas.height = contentHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }
            
            ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
            
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (err) => reject(new Error(`Image load error during cropping: ${err}`));
    });
};

// Resizes an image to fit within a square and adds padding.
const resizeImage = (file: File, targetDimension: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetDimension;
                canvas.height = targetDimension;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context.'));

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, targetDimension, targetDimension);

                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;
                if (aspectRatio > 1) {
                    newWidth = targetDimension;
                    newHeight = targetDimension / aspectRatio;
                } else {
                    newHeight = targetDimension;
                    newWidth = targetDimension * aspectRatio;
                }
                const x = (targetDimension - newWidth) / 2;
                const y = (targetDimension - newHeight) / 2;
                
                ctx.drawImage(img, x, y, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Helper to convert File to a data URL string
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const createModelInputImage = (
    baseImageFile: File,
    maskDataUrl: string,
    mode: 'isolate' | 'inpaint'
): Promise<File> => {
    return new Promise(async (resolve, reject) => {
        const targetDimension = 1024;
        const baseImg = new Image();
        baseImg.src = URL.createObjectURL(baseImageFile);
        await baseImg.decode();
        URL.revokeObjectURL(baseImg.src);

        const maskImg = new Image();
        maskImg.src = maskDataUrl;
        await maskImg.decode();

        const canvas = document.createElement('canvas');
        canvas.width = targetDimension;
        canvas.height = targetDimension;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return reject(new Error('Could not get canvas context.'));
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, targetDimension, targetDimension);
        
        const aspectRatio = baseImg.naturalWidth / baseImg.naturalHeight;
        let newWidth, newHeight;
        if (aspectRatio > 1) {
            newWidth = targetDimension;
            newHeight = targetDimension / aspectRatio;
        } else {
            newHeight = targetDimension;
            newWidth = targetDimension * aspectRatio;
        }
        const x = (targetDimension - newWidth) / 2;
        const y = (targetDimension - newHeight) / 2;

        ctx.drawImage(baseImg, x, y, newWidth, newHeight);

        if (mode === 'isolate') {
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(maskImg, x, y, newWidth, newHeight);
        } else { // inpaint
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = targetDimension;
            tempCanvas.height = targetDimension;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) return reject('Could not get temp canvas context');

            tempCtx.drawImage(maskImg, x, y, newWidth, newHeight);
            const imageData = tempCtx.getImageData(0, 0, targetDimension, targetDimension);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) { // If pixel is not transparent in mask
                    data[i] = 255; // R
                    data[i + 1] = 0;   // G
                    data[i + 2] = 255; // B
                    data[i + 3] = 255; // A
                }
            }
            tempCtx.putImageData(imageData, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        canvas.toBlob(blob => {
            if (blob) {
                resolve(new File([blob], `${mode}-image.png`, { type: 'image/png' }));
            } else {
                reject(new Error('Failed to create blob from canvas'));
            }
        }, 'image/png');
    });
};

/**
 * Applies a material from a source image to a target area in a scene image using masks.
 */
export const applyMaterial = async (
    materialImage: File,
    materialMask: string,
    sceneImage: File,
    sceneMask: string
): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting material transfer process...');
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const { width: sceneWidth, height: sceneHeight } = await getImageDimensions(sceneImage);
  const MAX_DIMENSION = 1024;
  
  console.log('Preparing images for the model...');
  const [isolatedMaterialImage, inpaintingSceneImage] = await Promise.all([
      createModelInputImage(materialImage, materialMask, 'isolate'),
      createModelInputImage(sceneImage, sceneMask, 'inpaint')
  ]);

  const debugImageUrl = await fileToDataUrl(inpaintingSceneImage);

  console.log('Generating prompt for material transfer...');
  const prompt = `
**Role:**
You are a material transfer expert. Your task is to apply a material from one image to a magenta-marked area in another.

**Inputs:**
- **Image 1 (Material Source):** This image shows ONLY the material to be used, isolated on a black background.
- **Image 2 (Scene Target):** This image contains a scene where a specific area is marked in bright magenta (#FF00FF).

**Task:**
1.  **Identify Material:** Analyze the texture, pattern, and properties of the material in the 'Material Source' image.
2.  **Apply to Target:** Re-texture the entire magenta area in the 'Scene Target' image with the identified material.
3.  **Ensure Realism:** The final image must be photorealistic. The applied material must seamlessly integrate into the scene, correctly adapting to the scene's original lighting, shadows, perspective, and reflections. The scale of the material's texture should be appropriate for the target surface. The magenta color should be completely replaced.

**Output:**
Provide ONLY the modified 'Scene Target' image as the final result. Do not include any text, explanations, or borders.
`;

  const textPart = { text: prompt };
  const materialPart = await fileToPart(isolatedMaterialImage);
  const scenePart = await fileToPart(inpaintingSceneImage);

  console.log('Sending images and prompt to the model...');
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [materialPart, scenePart, textPart] },
  });

  console.log('Received response from model.');
  
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    
    console.log('Cropping generated image to original scene aspect ratio...');
    const finalImageUrl = await cropToOriginalAspectRatio(
        generatedSquareImageUrl,
        sceneWidth,
        sceneHeight,
        MAX_DIMENSION
    );
    
    return { finalImageUrl, debugImageUrl, finalPrompt: prompt };
  }

  console.error("Model response did not contain an image part.", response);
  throw new Error("The AI model did not return an image. Please try again.");
};