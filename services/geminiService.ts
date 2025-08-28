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

/**
 * Draws red borders around the masked area on the original image
 */
const drawRedBordersFromMask = async (
    baseImageFile: File,
    maskDataUrl: string
): Promise<File> => {
    return new Promise(async (resolve, reject) => {
        const baseImg = new Image();
        baseImg.src = URL.createObjectURL(baseImageFile);
        await baseImg.decode();
        URL.revokeObjectURL(baseImg.src);

        const maskImg = new Image();
        maskImg.src = maskDataUrl;
        await maskImg.decode();

        const canvas = document.createElement('canvas');
        canvas.width = baseImg.naturalWidth;
        canvas.height = baseImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context.'));

        // Draw the original image
        ctx.drawImage(baseImg, 0, 0);

        // Create a temporary canvas for edge detection
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return reject(new Error('Could not get temp canvas context.'));

        // Draw mask to temp canvas
        tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Find edges of the mask
        const edges = new Set<string>();
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;
                const alpha = data[idx + 3];
                
                if (alpha > 0) {
                    // Check neighbors
                    const neighbors = [
                        [-1, -1], [0, -1], [1, -1],
                        [-1, 0],           [1, 0],
                        [-1, 1],  [0, 1],  [1, 1]
                    ];
                    
                    for (const [dx, dy] of neighbors) {
                        const nx = x + dx;
                        const ny = y + dy;
                        const nidx = (ny * canvas.width + nx) * 4;
                        const nalpha = data[nidx + 3];
                        
                        // If neighbor is transparent, this is an edge pixel
                        if (nalpha === 0) {
                            edges.add(`${x},${y}`);
                            break;
                        }
                    }
                }
            }
        }

        // Draw red borders
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        
        // Convert edge pixels to paths
        const visited = new Set<string>();
        edges.forEach(edge => {
            if (!visited.has(edge)) {
                const [startX, startY] = edge.split(',').map(Number);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                
                let currentX = startX;
                let currentY = startY;
                visited.add(edge);
                
                // Try to follow the edge
                let found = true;
                while (found) {
                    found = false;
                    const neighbors = [
                        [-1, -1], [0, -1], [1, -1],
                        [-1, 0],           [1, 0],
                        [-1, 1],  [0, 1],  [1, 1]
                    ];
                    
                    for (const [dx, dy] of neighbors) {
                        const nx = currentX + dx;
                        const ny = currentY + dy;
                        const nkey = `${nx},${ny}`;
                        
                        if (edges.has(nkey) && !visited.has(nkey)) {
                            ctx.lineTo(nx, ny);
                            visited.add(nkey);
                            currentX = nx;
                            currentY = ny;
                            found = true;
                            break;
                        }
                    }
                }
                
                ctx.stroke();
            }
        });

        canvas.toBlob(blob => {
            if (blob) {
                resolve(new File([blob], 'red-border-image.jpeg', { type: 'image/jpeg' }));
            } else {
                reject(new Error('Failed to create blob from canvas'));
            }
        }, 'image/jpeg', 0.95);
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
/**
 * Extracts and analyzes material characteristics from the masked area
 */
const extractMaterialDescription = async (
    ai: GoogleGenAI,
    materialImage: File,
    materialMask: string
): Promise<string> => {
    console.log('Starting material extraction...');
    
    // Draw red borders on the original image
    const redBorderedImage = await drawRedBordersFromMask(materialImage, materialMask);
    // Resize to 1024x1024 for model input
    const resizedImage = await resizeImage(redBorderedImage, 1024);
    
    const prompt = `赤い線で囲われた領域内の素材について、以下の観点から詳細に分析し、記述してください：

【質感】
- 表面の粗さ・滑らかさ（マット、光沢、ザラザラ、ツルツルなど）
- 透明度・不透明度
- 反射特性（鏡面反射、拡散反射など）
- 材質感（金属、木材、プラスチック、布、石材など）

【色彩】
- メインカラー（具体的な色名、明度、彩度）
- サブカラー・アクセント色
- グラデーション・色の変化
- 光の当たり方による色の変化

【パターン・テクスチャ】
- 模様、柄、テクスチャの詳細
- 繰り返しパターンの特徴
- 凹凸や立体感

これらの特徴を自然な文章で詳細に記述してください。`;

    const textPart = { text: prompt };
    const materialPart = await fileToPart(resizedImage);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: { parts: [materialPart, textPart] },
    });
    
    const description = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!description) {
        throw new Error("Failed to extract material description");
    }
    
    console.log('Material description extracted:', description);
    return description;
};

/**
 * Detects and analyzes the target area characteristics
 */
const detectSceneArea = async (
    ai: GoogleGenAI,
    sceneImage: File,
    sceneMask: string
): Promise<string> => {
    console.log('Starting scene area detection...');
    
    // Draw red borders on the original image
    const redBorderedImage = await drawRedBordersFromMask(sceneImage, sceneMask);
    // Resize to 1024x1024 for model input
    const resizedImage = await resizeImage(redBorderedImage, 1024);
    
    const prompt = `赤い線で囲われた領域について、以下の観点から詳細に分析し、記述してください：

【位置情報】
- 画像内での相対的な位置（上部、下部、中央、左右など）
- 他のオブジェクトとの位置関係
- 背景や前景との関係

【範囲・形状】
- 領域の大きさ（画像全体に対する割合）
- 形状の特徴（矩形、円形、不規則など）
- 境界の明確さ・曖昧さ

【空間的特徴】
- 立体感・奥行き
- 光の当たり方・影の状態
- 視点・角度
- 周囲との調和・コントラスト

【現在の状態】
- 既存の素材・テクスチャ
- 色調・明度
- 置き換えが必要な部分の特定

これらの情報を空間認識に基づいて詳細に記述してください。`;
    
    const textPart = { text: prompt };
    const scenePart = await fileToPart(resizedImage);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: { parts: [scenePart, textPart] },
    });
    
    const description = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!description) {
        throw new Error("Failed to detect scene area");
    }
    
    console.log('Scene area description extracted:', description);
    return description;
};

export const applyMaterial = async (
    materialImage: File,
    materialMask: string,
    sceneImage: File,
    sceneMask: string
): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string; materialDebugUrl?: string; sceneDebugUrl?: string; }> => {
  console.log('Starting material transfer process...');
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const { width: sceneWidth, height: sceneHeight } = await getImageDimensions(sceneImage);
  const MAX_DIMENSION = 1024;
  
  // Create red-bordered images for debugging
  const [materialRedBordered, sceneRedBordered] = await Promise.all([
    drawRedBordersFromMask(materialImage, materialMask),
    drawRedBordersFromMask(sceneImage, sceneMask)
  ]);
  
  const [materialDebugUrl, sceneDebugUrl] = await Promise.all([
    fileToDataUrl(materialRedBordered),
    fileToDataUrl(sceneRedBordered)
  ]);
  
  // Stage 1 & 2: Extract material description and detect scene area in parallel
  console.log('Analyzing material and scene area...');
  const [materialDescription, sceneAreaDescription] = await Promise.all([
    extractMaterialDescription(ai, materialImage, materialMask),
    detectSceneArea(ai, sceneImage, sceneMask)
  ]);

  // Stage 3: Apply material using the descriptions
  console.log('Applying material to scene...');
  const inpaintingSceneImage = await createModelInputImage(sceneImage, sceneMask, 'inpaint');
  const debugImageUrl = await fileToDataUrl(inpaintingSceneImage);

  const prompt = `以下の条件に基づいて、画像の指定箇所に素材を自然に適用した新しい画像を生成してください：

【素材の特徴】
${materialDescription}

【適用箇所の詳細】
${sceneAreaDescription}

【生成要件】
- 元の画像の構図・雰囲気を保持する
- 素材の質感・色彩を忠実に再現する
- 光の当たり方・影を自然に調整する
- 周囲との境界を滑らかに馴染ませる
- パースペクティブ（遠近感）を正しく適用する
- 既存のオブジェクトとの調和を保つ

【品質基準】
- 違和感のない自然な合成
- 高解像度・高品質
- リアリスティックな仕上がり

元の画像の品質と一貫性を保ちながら、指定された素材を適用箇所に自然に融合させてください。`;

  const textPart = { text: prompt };
  const scenePart = await fileToPart(inpaintingSceneImage);

  console.log('Generating final image with material applied...');
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [scenePart, textPart] },
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
    
    return { finalImageUrl, debugImageUrl, finalPrompt: prompt, materialDebugUrl, sceneDebugUrl };
  }

  console.error("Model response did not contain an image part.", response);
  throw new Error("The AI model did not return an image. Please try again.");
};