/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { resizeImage } from '../utils/imageUtils';
import { drawRedBordersFromMask } from '../utils/canvasUtils';
import { generateContentWithImage, extractTextFromResponse } from './aiService';

/**
 * Service for material and scene analysis using AI
 */

/**
 * Material analysis prompt in Japanese for detailed material characteristics extraction
 */
const MATERIAL_ANALYSIS_PROMPT = `赤い線で囲われた領域内の素材について、以下の観点から詳細に分析し、記述してください：

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

/**
 * Scene area analysis prompt in Japanese for spatial understanding
 */
const SCENE_ANALYSIS_PROMPT = `赤い線で囲われた領域について、以下の観点から詳細に分析し、記述してください：

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

/**
 * Extracts and analyzes material characteristics from the masked area
 * @param materialImage - The source material image file
 * @param materialMask - Data URL of the mask defining the material area
 * @returns Detailed description of the material characteristics
 */
export const extractMaterialDescription = async (
  materialImage: File,
  materialMask: string
): Promise<string> => {
  console.log('Starting material extraction...');
  
  // Create debug image with red borders around the masked area
  const redBorderedImage = await drawRedBordersFromMask(materialImage, materialMask);
  // Resize to standard dimension for AI processing
  const resizedImage = await resizeImage(redBorderedImage, 1024);
  
  // Generate material analysis using AI
  const response = await generateContentWithImage(
    'gemini-2.5-flash-lite',
    resizedImage,
    MATERIAL_ANALYSIS_PROMPT
  );
  
  const description = extractTextFromResponse(response);
  console.log('Material description extracted:', description);
  return description;
};

/**
 * Detects and analyzes the target area characteristics in the scene
 * @param sceneImage - The target scene image file
 * @param sceneMask - Data URL of the mask defining the target area
 * @returns Detailed description of the scene area characteristics
 */
export const detectSceneArea = async (
  sceneImage: File,
  sceneMask: string
): Promise<string> => {
  console.log('Starting scene area detection...');
  
  // Create debug image with red borders around the masked area
  const redBorderedImage = await drawRedBordersFromMask(sceneImage, sceneMask);
  // Resize to standard dimension for AI processing
  const resizedImage = await resizeImage(redBorderedImage, 1024);
  
  // Generate scene area analysis using AI
  const response = await generateContentWithImage(
    'gemini-2.5-flash-lite',
    resizedImage,
    SCENE_ANALYSIS_PROMPT
  );
  
  const description = extractTextFromResponse(response);
  console.log('Scene area description extracted:', description);
  return description;
};