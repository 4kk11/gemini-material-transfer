/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getImageDimensions, cropToOriginalAspectRatio } from '../utils/imageUtils';
import { fileToDataUrl } from '../utils/fileUtils';
import { drawRedBordersFromMask, createModelInputImage } from '../utils/canvasUtils';
import { MAX_IMAGE_DIMENSION } from '../utils/constants';
import { generateContentWithTwoImages, extractImageFromResponse } from './aiService';
import { extractMaterialDescription } from './materialAnalysis';

/**
 * Main service for material transfer operations
 * 
 * This service orchestrates the complete material transfer workflow:
 * 1. Analyzes material characteristics from the source image
 * 2. Generates the final image with material applied using AI with two images input
 */

/**
 * Prompt template for material application generation in Japanese
 */
const MATERIAL_APPLICATION_PROMPT = (materialDescription: string) => 
`# 材料変換システム

あなたは高精度な材料変換の専門家です。赤い線で領域指定した部分の材料を、指定された新しい材料に変更します。

## 入力

### 画像
- 1枚目：赤い線で領域指定したシーン画像（変更対象領域を示す）
- 2枚目：オリジナルのシーン画像（元の状態）
- 黒背景や余白部分は無視し、画像本体のみを対象とします

### 材料情報
- 変換先の材料の詳細な特性が以下で提供されます
- **新材料の特性**: 「${materialDescription}」

## 変換の実行手順

1. **領域の特定**: 赤い線で指定された領域を正確に識別
2. **材料の置換**: 指定領域の既存材料を新しい材料に完全に置換
3. **環境適応**: 周囲の照明・遠近感・スケールに合わせて新材料を調整
4. **物理的整合性**: 接触面の影、反射、質感の自然な表現

## 品質要件

### 視覚的統合
- シーンの照明条件（色温度・露出・影の方向）に完全適合
- カメラ視点に応じた遠近法と歪み補正の適用
- 周囲オブジェクトとの自然なスケール比の維持

### 物理的リアリズム  
- 表面接触による自然な影とアンビエントオクルージョン
- 材料表面の反射特性（BRDF）をシーン照明で再現
- エッジの滑らかなブレンドと不自然な縁取りの除去

### 禁止事項
- 単純な画像貼り付けや重ね合わせ
- 材料を適用せずに元シーンを返すこと
- 複数箇所への重複適用
- 指定された領域以外の部分を変更すること

## 出力

最終的な合成画像のみを生成してください。説明文やコメントは一切不要です。

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
}

/**
 * Applies a material from a source image to a target area in a scene image using masks
 * 
 * This is the main entry point for the material transfer functionality. It performs:
 * 1. Material characteristic extraction
 * 2. AI-powered material application using two images input
 * 3. Result processing
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
  
  // Stage 1: Analyze material characteristics
  console.log('Analyzing material characteristics...');
  const materialDescription = await extractMaterialDescription(materialImage, materialMask);

  // Stage 2: Prepare scene for material application and generate final image
  console.log('Applying material to scene...');
  const debugImageUrl = await fileToDataUrl(sceneImage);
  // Generate the final prompt with material description
  const finalPrompt = MATERIAL_APPLICATION_PROMPT(materialDescription);

  // Generate the final image using AI with two images
  console.log('Generating final image with material applied...');
  const response = await generateContentWithTwoImages(
    'gemini-2.5-flash-image-preview',
    sceneRedBordered,
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
    materialDescription
  };
};