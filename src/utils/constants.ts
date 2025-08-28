/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Application constants and configuration values
 */

/**
 * Loading messages displayed during material transfer process
 */
export const LOADING_MESSAGES = [
  "Extracting material characteristics with AI...",
  "Analyzing target area in the scene...",
  "Generating detailed material description...",
  "Processing scene area properties...",
  "Applying material with natural integration...",
  "Finalizing photorealistic result..."
];

/**
 * Maximum dimension for image processing
 */
export const MAX_IMAGE_DIMENSION = 1024;

/**
 * Default assets for instant start feature
 */
export const DEFAULT_ASSETS = {
  OBJECT_IMAGE: '/assets/object.jpeg',
  SCENE_IMAGE: '/assets/scene.jpeg',
  OBJECT_MASK: '/assets/object-mask.png',
  SCENE_MASK: '/assets/scene-mask.png'
} as const;