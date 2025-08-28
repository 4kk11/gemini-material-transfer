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
const MATERIAL_ANALYSIS_PROMPT = `
# 役割

あなたは材料分析の専門家です。タスクは赤い線で領域指定した画像を分析し、その材料の色、質感、特徴について詳細な記述を提供することです。

# 仕様

## 入力

* 赤い線で領域指定した画像が提供されます。
* 赤い領域は材料を転写する対象領域です。

## 分析対象

* **色**: 基調色、濃淡、光沢、透明度
* **質感**: 表面の粗さ、滑らかさ、パターン、テクスチャ
* **特徴**: 材質の種類、反射性、物理的特性

# 材料記述の要件

## 記述例

* 「深い茶褐色（#8B4513）で、木目が縦に流れる滑らかな表面を持つ木材です。光を緩やかに反射し、自然な艶があります。」
* 「光沢のない濃紺（#1E3A8A）のファブリックで、微細な織り模様が見える布地です。柔らかい質感で、わずかに毛羽立ちがあります。」
* 「明るい銀色（#C0C0C0）のメタル素材で、鏡面のような強い反射をします。表面は完全に滑らかで、指紋や小さな傷が見えます。」
* 「鮮やかなオレンジ（#FF8C00）の樹脂製素材で、つや消しの仕上げです。軽い凹凸のあるテクスチャで、やや弾力があります。」

## 記述の詳細度

* **色**: 正確な色調（暖色/寒色、彩度、明度）とカラーコード
* **質感**: 触覚的な特性（粗い、滑らか、ざらざら、つるつる等）
* **光学特性**: 反射率、透明度、艶の有無
* **パターン**: 木目、織り、メッシュ、格子等のパターン

# 出力

* 材料の色、質感、特徴を詳細に記述してください。
* 記述は材料転写システムで使用されるため、**正確で再現可能な表現**を心がけてください。
* 3-4文程度で簡潔かつ包括的に記述してください。
* `;

/**
 * Scene area analysis prompt in Japanese for spatial understanding
 */
const SCENE_ANALYSIS_PROMPT = `
# 役割

あなたは空間位置解析の専門家です。タスクは赤い線で領域指定した画像を分析し、その領域の具体的な空間位置と場所を自然な言葉で正確に表現することです。

# 仕様

## 入力

* 赤い線で領域指定した画像が提供されます。
* 赤い領域は空間内での具体的な位置と場所を特定する対象領域です。

## 分析対象

* **空間的関係**: 周囲のオブジェクトや構造物との位置関係
* **物理的位置**: 壁、床、天井、家具などの具体的な場所
* **領域の特徴**: 形状、大きさ、範囲の空間的な説明

# 空間位置記述の要件

## 位置記述例

* 「指定領域は、グレーのファブリックソファの後ろにある白い漆喰壁の中央部分です。」
* 「指定領域は、大きな窓の右側に位置するベージュ色の壁面で、白いレースカーテンの陰になっている部分です。」
* 「指定領域は、濃い茶色の木製ダイニングテーブルの左手前のオークフローリング床面で、黒い椅子の足元近くの範囲です。」
* 「指定領域は、白い人工大理石のキッチンカウンターの奥側、ステンレス製冷蔵庫と水色のタイル壁の間のコーナー部分です。」

## 空間関係記述例

* 「指定領域は、大きな緑の観葉植物の左側にある窓際の明るいコンクリート床面です。」
* 「指定領域は、濃い茶色の木製本棚に向かって右側の薄いグリーンの壁面で、金色の額縁の下の空いているスペースです。」
* 「指定領域は、クイーンサイズベッドの足元から約50cm離れた薄いグレーのカーペット床で、白いクローゼットドアに面した位置です。」

## 構造的位置記述例

* 「指定領域は、部屋の角（コーナー）にある白いクロス張りの壁面の下部分です。」
* 「指定領域は、入り口から見て奥のクリーム色の壁で、白い天井から約1m下がった高さの範囲です。」
* 「指定領域は、リビングルームの中央付近の温かみのある木製フローリング床面で、ベージュのソファと黒いテレビ台の間の通路部分です。」

## 領域の形状・範囲記述例

* 「指定領域は、約1m四方の正方形状の濃いグレーのタイル床面範囲です。」
* 「指定領域は、縦長の長方形で、薄いピンクの壁面の上下にわたって広がっています。」
* 「指定領域は、不規則な形状で、茶色の木製家具の間の白い床面の隙間を埋めるような範囲です。」

# 記述の要件

## 参照物の活用

* 家具、壁、窓、ドアなどの固定物を参照点として使用
* 「左側」「右側」「奥」「手前」「上」「下」などの方向性を明確に表現
* 距離感を「近く」「離れて」「約○○cm」「○○の横」などで表現

## 空間の構造化

* 部屋の種類（リビング、キッチン、寝室等）を特定
* 部屋の構造（角、中央、端等）での位置を明示
* 機能的な空間（通路、作業スペース、くつろぎエリア等）での位置

# 出力

* 領域の具体的な空間位置を、周囲のオブジェクトとの関係で記述してください。
* 記述は空間配置システムで使用されるため、**直感的で理解しやすい表現**を心がけてください。
* 3-4文程度で位置・場所・空間関係を包括的に記述してください。`;

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