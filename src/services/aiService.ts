/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { fileToPart } from '../utils/fileUtils';

// Custom error class for RECITATION errors
export class RecitationError extends Error {
  constructor(message: string, public attempts: number) {
    super(message);
    this.name = 'RecitationError';
  }
}

/**
 * AI service for interacting with Google's Gemini API
 */

/**
 * Gets a configured instance of the Google GenAI client
 * @returns Configured GoogleGenAI instance
 */
export const getAIClient = (): GoogleGenAI => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Progress callback function type for AI operations
 */
export type ProgressCallback = (message: string) => void;

/**
 * Generates content using Gemini with image and text inputs
 * @param model - The Gemini model to use
 * @param imageFile - Image file to analyze
 * @param prompt - Text prompt for the AI
 * @param onProgress - Optional progress callback
 * @returns AI response with generated content
 */
export const generateContentWithImage = async (
  model: string,
  imageFile: File,
  prompt: string,
  onProgress?: ProgressCallback
): Promise<GenerateContentResponse> => {
  const ai = getAIClient();
  
  // Add random seed and explicit originality nudge to reduce RECITATION
  const randomSeed = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const uniquePrompt = `${prompt}\n\n[重要: 入力画像の直接複製は禁止。必ずオリジナルに合成してください]\n[Session: ${randomSeed}_${timestamp}]`;
  
  const textPart = { text: uniquePrompt };
  const imagePart = await fileToPart(imageFile);
  
  // Retry logic for RECITATION errors
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      if (attempts > 0) {
        onProgress?.(`Retrying generation (attempt ${attempts + 1})...`);
      }
      
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] }
      });
      
      // Check if response contains RECITATION error
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'RECITATION') {
        console.warn(`RECITATION detected on attempt ${attempts + 1}/${maxAttempts}`);
        attempts++;
        if (attempts >= maxAttempts) {
          throw new RecitationError(
            `The AI model stopped processing because the content might be too similar to existing data. Please try using more specific and creative instructions, or try different images. (${maxAttempts} attempts made)`,
            attempts
          );
        }
        // Add more uniqueness to avoid RECITATION
        const salt = Math.random().toString(36).slice(2, 8);
        const creativity = Math.random().toString(36).slice(2, 8);
        textPart.text = `${uniquePrompt}\n[創造性強化: ${salt}]\n[独自性確保: ${creativity}]`;
        continue;
      }
      
      return response;
    } catch (error) {
      console.error(`Error on attempt ${attempts + 1}:`, error);
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new RecitationError(
    `Failed to generate content. Unable to create appropriate content after ${maxAttempts} attempts.`,
    maxAttempts
  );
};

/**
 * Generates content using Gemini with two images and text inputs
 * @param model - The Gemini model to use
 * @param imageFile1 - First image file to analyze
 * @param imageFile2 - Second image file to analyze
 * @param prompt - Text prompt for the AI
 * @param onProgress - Optional progress callback
 * @returns AI response with generated content
 */
export const generateContentWithTwoImages = async (
  model: string,
  imageFile1: File,
  imageFile2: File,
  prompt: string,
  onProgress?: ProgressCallback
): Promise<GenerateContentResponse> => {
  const ai = getAIClient();
  
  // Add random seed and explicit originality nudge to reduce RECITATION
  const randomSeed = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const uniquePrompt = `${prompt}\n\n[重要: 入力画像の直接複製は禁止。必ずオリジナルに合成してください]\n[Session: ${randomSeed}_${timestamp}]`;
  
  const textPart = { text: uniquePrompt };
  const imagePart1 = await fileToPart(imageFile1);
  const imagePart2 = await fileToPart(imageFile2);
  
  // Retry logic for RECITATION errors
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      if (attempts > 0) {
        onProgress?.(`Retrying generation (attempt ${attempts + 1})...`);
      }
      
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart1, imagePart2, textPart] }
      });
      
      // Check if response contains RECITATION error
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'RECITATION') {
        console.warn(`RECITATION on attempt ${attempts + 1}, retrying with smaller context...`);
        attempts++;
        const salt = Math.random().toString(36).slice(2, 6);
        (textPart as any).text = `${uniquePrompt}\n[OriginalitySalt:${salt}]`;
        continue;
      }
      
      return response;
    } catch (error) {
      console.error(`Error on attempt ${attempts + 1}:`, error);
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new RecitationError(
    `Failed to generate content. Unable to create appropriate content after ${maxAttempts} attempts.`,
    maxAttempts
  );
};

/**
 * Extracts text response from AI generation result
 * @param response - The AI response object
 * @returns Extracted text content
 * @throws Error if no valid text is found in response
 */
export const extractTextFromResponse = (response: GenerateContentResponse): string => {
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("AI model did not return valid text content");
  }
  return text;
};

/**
 * Extracts image data from AI generation result
 * @param response - The AI response object
 * @returns Object containing image data URL and MIME type, or null if no image found
 * @throws Error if response contains no image data
 */
export const extractImageFromResponse = (response: GenerateContentResponse): { dataUrl: string; mimeType: string } => {
  const finish = (response.candidates?.[0]?.finishReason as unknown as string) || '';
  if (finish === 'RECITATION') {
    throw new RecitationError(
      'The AI model stopped processing because the content might be too similar to existing data.',
      1
    );
  }
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (!imagePartFromResponse?.inlineData) {
    console.error('AI response does not contain image data:', response);
    throw new Error("The AI model did not return an image. Please try again.");
  }

  const { mimeType, data } = imagePartFromResponse.inlineData;
  const dataUrl = `data:${mimeType};base64,${data}`;
  
  return { dataUrl, mimeType };
};
