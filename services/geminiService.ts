/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getImageDimensions, cropToOriginalAspectRatio } from '../utils/imageUtils';
import { fileToDataUrl } from '../utils/fileUtils';
import { drawRedBordersFromMask, createModelInputImage } from '../utils/canvasUtils';
import { MAX_IMAGE_DIMENSION } from '../utils/constants';
import { generateContentWithImage, extractImageFromResponse } from './aiService';
import { extractMaterialDescription, detectSceneArea } from './materialAnalysis';

/**
 * Main service for material transfer operations
 * 
 * This service orchestrates the complete material transfer workflow:
 * 1. Analyzes material characteristics from the source image
 * 2. Detects and analyzes the target scene area
 * 3. Generates the final image with material applied using AI
 */

/**
 * Prompt template for material application generation in Japanese
 */
const MATERIAL_APPLICATION_PROMPT = (materialDescription: string, sceneAreaDescription: string) => 
`以下の条件に基づいて、画像の指定箇所に素材を自然に適用した新しい画像を生成してください：

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

/**
 * Result interface for material transfer operation
 */
export interface MaterialTransferResult {
  /** Final generated image as data URL */
  finalImageUrl: string;
  /** Debug image showing inpainting input */
  debugImageUrl: string;
  /** The prompt used for final generation */
  finalPrompt: string;
  /** Debug image showing material area with red borders */
  materialDebugUrl?: string;
  /** Debug image showing scene area with red borders */
  sceneDebugUrl?: string;
  /** AI-generated material description */
  materialDescription?: string;
  /** AI-generated scene area description */
  sceneAreaDescription?: string;
}

/**
 * Applies a material from a source image to a target area in a scene image using masks
 * 
 * This is the main entry point for the material transfer functionality. It performs:
 * 1. Material characteristic extraction
 * 2. Scene area analysis
 * 3. AI-powered material application
 * 4. Result processing and cropping
 * 
 * @param materialImage - Source image containing the material to extract
 * @param materialMask - Mask data URL defining the material area
 * @param sceneImage - Target scene image where material will be applied
 * @param sceneMask - Mask data URL defining the target area in the scene
 * @returns Complete result including final image and debug information
 */
export const applyMaterial = async (
  materialImage: File,
  materialMask: string,
  sceneImage: File,
  sceneMask: string
): Promise<MaterialTransferResult> => {
  console.log('Starting material transfer process...');

  // Get original scene dimensions for final cropping
  const { width: sceneWidth, height: sceneHeight } = await getImageDimensions(sceneImage);
  
  // Create red-bordered debug images for both material and scene
  console.log('Creating debug images...');
  const [materialRedBordered, sceneRedBordered] = await Promise.all([
    drawRedBordersFromMask(materialImage, materialMask),
    drawRedBordersFromMask(sceneImage, sceneMask)
  ]);
  
  // Convert debug images to data URLs for frontend display
  const [materialDebugUrl, sceneDebugUrl] = await Promise.all([
    fileToDataUrl(materialRedBordered),
    fileToDataUrl(sceneRedBordered)
  ]);
  
  // Stage 1 & 2: Parallel analysis of material and scene area
  console.log('Analyzing material and scene area...');
  const [materialDescription, sceneAreaDescription] = await Promise.all([
    extractMaterialDescription(materialImage, materialMask),
    detectSceneArea(sceneImage, sceneMask)
  ]);

  // Stage 3: Prepare scene for inpainting and generate final image
  console.log('Applying material to scene...');
  const inpaintingSceneImage = await createModelInputImage(sceneImage, sceneMask, 'inpaint');
  const debugImageUrl = await fileToDataUrl(inpaintingSceneImage);

  // Generate the final prompt combining material and scene descriptions
  const finalPrompt = MATERIAL_APPLICATION_PROMPT(materialDescription, sceneAreaDescription);

  // Generate the final image using AI
  console.log('Generating final image with material applied...');
  const response = await generateContentWithImage(
    'gemini-2.5-flash-image-preview',
    inpaintingSceneImage,
    finalPrompt
  );

  console.log('Received response from model.');
  
  // Extract the generated image from AI response
  const { dataUrl: generatedSquareImageUrl } = extractImageFromResponse(response);
  
  // Crop the square generated image back to original scene aspect ratio
  console.log('Cropping generated image to original scene aspect ratio...');
  const finalImageUrl = await cropToOriginalAspectRatio(
    generatedSquareImageUrl,
    sceneWidth,
    sceneHeight,
    MAX_IMAGE_DIMENSION
  );
  
  return {
    finalImageUrl,
    debugImageUrl,
    finalPrompt,
    materialDebugUrl,
    sceneDebugUrl,
    materialDescription,
    sceneAreaDescription
  };
};