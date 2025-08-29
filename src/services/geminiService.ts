/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fileToDataUrl } from '../utils/fileUtils';
import { drawPurpleFillFromMask, drawRedMarkerFromPosition, createMaskFromMarkerPosition, drawRedBordersFromMask } from '../utils/canvasUtils';
import { generateContentWithTwoImages, generateContentWithImage, extractImageFromResponse } from './aiService';
import { resizeImage } from '../utils/imageUtils';

/**
 * Main service for material transfer operations
 * 
 * This service orchestrates the complete material transfer workflow:
 * 1. Generates seamless texture from the source material
 * 2. Applies the texture to the target scene using AI with two images input
 */

/**
 * Prompt template for seamless texture generation in Japanese
 */
const SEAMLESS_TEXTURE_GENERATION_PROMPT = `
# シームレステクスチャ生成システム

あなたは高精度なテクスチャ生成の専門家です。赤いマーカーで指定された材料から、シームレスで繰り返し可能なテクスチャを生成します。

## 入力

### 画像
- 赤いマーカーで材料が指定された画像が提供されます
- 赤いマーカー周辺の材料特性を基にテクスチャを生成してください

## テクスチャ生成の要件

### 基本要件
- **シームレス**: 上下左右がつながる繰り返し可能なパターン
- **高解像度**: 細部まで鮮明で自然な質感
- **正方形**: 1:1のアスペクト比での出力

### 材料特性の再現
- **色調**: 元材料の正確な色味と濃淡
- **質感**: 表面の粗さ、滑らかさ、光沢感
- **パターン**: 木目、織り、金属の筋、石の模様など特徴的なパターン
- **光学特性**: 反射率、透明度、艶の有無を適切に表現

### 品質要件
- 継ぎ目が目立たない自然な繋がり
- 一定の密度とスケールでのパターン分布
- 元材料の物理的特性を忠実に再現

## 禁止事項
- 単純な画像の切り取りや拡大
- 継ぎ目が見える不自然な繰り返し
- 元材料と異なる色調や質感

## 出力

シームレスなテクスチャ画像のみを生成してください。説明文やコメントは一切不要です。
`;

/**
 * Prompt template for material application generation with texture input in Japanese
 */
const MATERIAL_APPLICATION_PROMPT = `
# テクスチャ適用システム

あなたは高精度なテクスチャ適用の専門家です。2枚目の画像の紫色の塗りつぶしで領域指定した部分に、1枚目のシームレステクスチャを適用します。

## 入力

### 画像
- 1枚目：シームレステクスチャ画像（適用する材料のテクスチャ）
- 2枚目：紫色の塗りつぶしで領域指定した元画像（適用先のシーン）

## テクスチャ適用の実行手順

1. **領域の特定**: 2枚目の画像で紫色の塗りつぶしで指定された領域を正確に識別
2. **テクスチャのマッピング**: 1枚目のシームレステクスチャを指定領域に自然に配置
3. **環境適応**: 周囲の照明・遠近感・スケールに合わせてテクスチャを調整
4. **物理的整合性**: 接触面の影、反射、質感の自然な表現

## 品質要件

### 視覚的統合
- シーンの照明条件（色温度・露出・影の方向）に完全適合
- カメラ視点に応じた遠近法と歪み補正の適用
- 周囲オブジェクトとの自然なスケール比の維持
- テクスチャの繰り返しパターンが自然に見える配置

### 物理的リアリズム  
- 表面接触による自然な影とアンビエントオクルージョン
- 材料表面の反射特性（BRDF）をシーン照明で再現
- エッジの滑らかなブレンドと不自然な縁取りの除去
- テクスチャの継ぎ目が見えない自然な配置

### 禁止事項
- 単純な画像貼り付けや重ね合わせ
- テクスチャを適用せずに元シーンを返すこと
- 複数箇所への重複適用
- 指定された領域以外の部分を変更すること
- テクスチャの不自然な繰り返しや歪み

## 出力

最終的な合成画像のみを生成してください。説明文やコメントは一切不要です。
`;

/**
 * Generates a seamless texture from the specified material area
 * @param materialImage - The source material image file
 * @param materialMarkerPosition - Marker position defining the material area
 * @returns Generated seamless texture as a File object
 */
const generateSeamlessTexture = async (
  materialImage: File,
  materialMarkerPosition: {x: number, y: number}
): Promise<File> => {
  console.log('Generating seamless texture from material...');
  
  // Create mask from marker position for material analysis
  const materialMask = await createMaskFromMarkerPosition(materialImage, materialMarkerPosition);
  
  // Create debug image with red borders around the masked area
  const redBorderedImage = await drawRedBordersFromMask(materialImage, materialMask);
  
  // Resize to standard dimension for AI processing
  const resizedImage = await resizeImage(redBorderedImage, 1024);
  
  // Generate seamless texture using AI
  const response = await generateContentWithImage(
    'gemini-2.5-flash-image-preview',
    resizedImage,
    SEAMLESS_TEXTURE_GENERATION_PROMPT
  );
  
  // Extract the generated texture image from AI response
  const { dataUrl } = extractImageFromResponse(response);
  
  // Convert data URL back to File for use in subsequent AI calls
  const base64Data = dataUrl.split(',')[1];
  const mimeType = dataUrl.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const binaryData = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  
  const textureFile = new File([arrayBuffer], 'seamless-texture.png', { type: mimeType });
  console.log('Seamless texture generated successfully');
  
  return textureFile;
};

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
  /** Debug image showing material area with purple fill */
  materialDebugUrl?: string;
  /** Debug image showing scene area with purple fill */
  sceneDebugUrl?: string;
  /** Generated seamless texture for debug display */
  seamlessTextureUrl?: string;
  /** Input image with red marker for material debug modal */
  materialInputImageUrl?: string;
  /** Prompt used for seamless texture generation */
  seamlessTexturePrompt?: string;
  /** Input image for result debug modal (purple-filled scene) */
  resultDebugInputImageUrl?: string;
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
 * @param materialMarkerPosition - Marker position defining the material area
 * @param sceneImage - Target scene image where material will be applied
 * @param sceneMask - Mask data URL defining the target area in the scene
 * @returns Complete result including final image and debug information
 */
export const applyMaterial = async (
  materialImage: File,
  materialMarkerPosition: {x: number, y: number} | null,
  sceneImage: File,
  sceneMask: string
): Promise<MaterialTransferResult> => {
  console.log('Starting material transfer process...');
  
  if (!materialMarkerPosition) {
    throw new Error('Material marker position is required');
  }
  
  // Create debug images - red marker for material, purple fill for scene
  console.log('Creating debug images...');
  const [materialRedMarker, scenePurpleFilled] = await Promise.all([
    drawRedMarkerFromPosition(materialImage, materialMarkerPosition),
    drawPurpleFillFromMask(sceneImage, sceneMask)
  ]);
  
  // Convert debug images to data URLs for frontend display
  const [materialDebugUrl, sceneDebugUrl] = await Promise.all([
    fileToDataUrl(materialRedMarker),
    fileToDataUrl(scenePurpleFilled)
  ]);
  
  // Stage 1: Generate seamless texture from material
  console.log('Generating seamless texture from material...');
  const seamlessTexture = await generateSeamlessTexture(materialImage, materialMarkerPosition);
  
  // Convert seamless texture to data URL for debug display
  const seamlessTextureUrl = await fileToDataUrl(seamlessTexture);

  // Stage 2: Apply texture to purple-filled areas in scene
  console.log('Applying texture to scene...');
  const debugImageUrl = await fileToDataUrl(sceneImage);
  const finalPrompt = MATERIAL_APPLICATION_PROMPT;

  // Generate the final image using AI with texture and purple-filled scene
  console.log('Generating final image with texture applied...');
  const response = await generateContentWithTwoImages(
    'gemini-2.5-flash-image-preview',
    seamlessTexture,
    scenePurpleFilled,
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
    seamlessTextureUrl,
    materialInputImageUrl: materialDebugUrl,
    seamlessTexturePrompt: SEAMLESS_TEXTURE_GENERATION_PROMPT,
    resultDebugInputImageUrl: sceneDebugUrl
  };
};