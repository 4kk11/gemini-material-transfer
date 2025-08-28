/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { fileToPart } from '../utils/fileUtils';

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
 * Generates content using Gemini with image and text inputs
 * @param model - The Gemini model to use
 * @param imageFile - Image file to analyze
 * @param prompt - Text prompt for the AI
 * @returns AI response with generated content
 */
export const generateContentWithImage = async (
  model: string,
  imageFile: File,
  prompt: string
): Promise<GenerateContentResponse> => {
  const ai = getAIClient();
  
  const textPart = { text: prompt };
  const imagePart = await fileToPart(imageFile);
  
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [imagePart, textPart] },
  });
  
  return response;
};

/**
 * Generates content using Gemini with two images and text inputs
 * @param model - The Gemini model to use
 * @param imageFile1 - First image file to analyze
 * @param imageFile2 - Second image file to analyze
 * @param prompt - Text prompt for the AI
 * @returns AI response with generated content
 */
export const generateContentWithTwoImages = async (
  model: string,
  imageFile1: File,
  imageFile2: File,
  prompt: string
): Promise<GenerateContentResponse> => {
  const ai = getAIClient();
  
  const textPart = { text: prompt };
  const imagePart1 = await fileToPart(imageFile1);
  const imagePart2 = await fileToPart(imageFile2);
  
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [imagePart1, imagePart2, textPart] },
  });
  
  return response;
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
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (!imagePartFromResponse?.inlineData) {
    throw new Error("The AI model did not return an image. Please try again.");
  }

  const { mimeType, data } = imagePartFromResponse.inlineData;
  const dataUrl = `data:${mimeType};base64,${data}`;
  
  return { dataUrl, mimeType };
};