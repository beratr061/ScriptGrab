/**
 * File validation utilities for ScriptGrab
 * Requirements: 1.1, 1.3, 1.4
 */

/**
 * Supported file extensions for transcription
 * Requirements: 1.3 - Support .mp3, .wav, .m4a, .mp4, .mkv
 */
export const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.mkv'] as const;

export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * Extract file extension from a file path or name
 * Returns lowercase extension including the dot (e.g., '.mp3')
 */
export function getFileExtension(filePath: string): string {
  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
    return '';
  }
  return filePath.slice(lastDotIndex).toLowerCase();
}

/**
 * Validate if a file format is supported for transcription
 * Requirements: 1.1, 1.3, 1.4
 * 
 * @param filePath - File path or file name to validate
 * @returns true if the file extension is supported, false otherwise
 * 
 * Case-insensitive check for: .mp3, .wav, .m4a, .mp4, .mkv
 */
export function validateFileFormat(filePath: string): boolean {
  const extension = getFileExtension(filePath);
  return SUPPORTED_EXTENSIONS.includes(extension as SupportedExtension);
}

/**
 * Check if a file extension is supported
 * @param extension - File extension (with or without leading dot)
 * @returns true if supported
 */
export function isSupportedExtension(extension: string): boolean {
  const normalizedExt = extension.startsWith('.') 
    ? extension.toLowerCase() 
    : `.${extension.toLowerCase()}`;
  return SUPPORTED_EXTENSIONS.includes(normalizedExt as SupportedExtension);
}

/**
 * Get a formatted string of supported formats for display
 */
export function getSupportedFormatsString(): string {
  return SUPPORTED_EXTENSIONS.map(ext => ext.toUpperCase().slice(1)).join(', ');
}
