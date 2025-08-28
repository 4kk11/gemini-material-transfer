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
`# 役割

あなたはビジュアル構成の専門家です。タスクは「**素材の種類・質感**」を「**シーン画像**」の指定領域にシームレスに\*\*適用（表面置換/デカール適用）\*\*し、遠近感・照明・スケール・質感を統合することです。

# 仕様

## シーン

* 黒い余白があれば無視し、**シーン本体**のみを対象にしてください。
* 幾何（面の向き・曲率）と既存の陰影・反射の連続性を保ちながら、対象領域の**表面材質を置換**します（必要に応じてデカール表現）。

# 配置指示（重要）

**素材の種類・質感は、下記で説明される領域に正確に適用してください。**
**この密度の高いセマンティック記述を用いて、シーン内の正確な場所を特定してください。**

素材の種類・質感記述: 「${materialDescription}」
適用先の領域記述: 「${sceneAreaDescription}」

# 最終画像の要件

* **スタイル/照明/影/反射/カメラ視点**はシーンに完全一致させること。
* 単なる色ベタやテクスチャ貼りではなく、**文脈に合わせて再レンダリング**すること（遠近・投影・歪み補正、色温度/露出一致、BRDF整合：法線/粗さ/金属度/反射の推定）。
* \*\*接触影/AO・自己遮蔽・反射/屈折（必要時）\*\*を整合させ、**オクルージョン関係**を破綻なく維持すること。
* **スケールは周囲オブジェクトと比例**させ、テクスチャの**タイル感**や解像度差を目立たせないこと。
* エッジは自然にブレンドし、**縁取り/ハロー**を残さないこと。
* **素材未適用の元シーンを返すことは禁止**。
`;

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
  const debugImageUrl = await fileToDataUrl(sceneImage);
  // Generate the final prompt combining material and scene descriptions
  const finalPrompt = MATERIAL_APPLICATION_PROMPT(materialDescription, sceneAreaDescription);

  // Generate the final image using AI
  console.log('Generating final image with material applied...');
  const response = await generateContentWithImage(
    'gemini-2.5-flash-image-preview',
    sceneImage,
    finalPrompt
  );

  console.log('Received response from model.');
  
  // Extract the generated image from AI response
  const { dataUrl: generatedSquareImageUrl } = extractImageFromResponse(response);
  
  // Crop the square generated image back to original scene aspect ratio
  console.log('Cropping generated image to original scene aspect ratio...');
  const finalImageUrl = generatedSquareImageUrl;
  
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