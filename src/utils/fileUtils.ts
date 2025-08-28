/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * File handling utilities for converting between different file formats
 */

/**
 * Converts a Blob to a data URL string
 * @param blob - The blob to convert
 * @returns Promise resolving to data URL string
 */
export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
};

/**
 * Converts a File to a data URL string
 * @param file - The file to convert
 * @returns Promise resolving to data URL string
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Converts a File object to a Gemini API Part format
 * @param file - The file to convert
 * @returns Promise resolving to Gemini API Part object
 */
export const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
  const dataUrl = await fileToDataUrl(file);
  
  const arr = dataUrl.split(',');
  if (arr.length < 2) throw new Error("Invalid data URL");
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
  
  const mimeType = mimeMatch[1];
  const data = arr[1];
  return { inlineData: { mimeType, data } };
};