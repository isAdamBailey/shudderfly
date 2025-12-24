// File validation constants and utilities
export const MAX_FILE_SIZE = 536870912; // 512MB
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/bmp",
  "image/gif",
  "image/svg+xml",
  "image/webp",
  "video/mp4",
  "video/avi",
  "video/quicktime",
  "video/mpeg",
  "video/webm",
  "video/x-matroska"
];

// Validation function for tests and components
export function validateFile(file) {
  const sizeError = file.size > MAX_FILE_SIZE;
  const typeError = !ALLOWED_FILE_TYPES.includes(file.type);
  return {
    valid: !sizeError && !typeError,
    sizeError,
    typeError,
    size: file.size,
    type: file.type
  };
}

// Note: Client-side compression has been removed - all compression happens on the backend
// This function is kept for backwards compatibility but always returns false
export function needsVideoOptimization(file) {
  return false; // Compression is handled on the backend
}

// Helper function to check if file type is allowed
export function isAllowedFileType(fileType) {
  return ALLOWED_FILE_TYPES.includes(fileType);
}

// Helper function to check if file size is within limits
export function isFileSizeValid(fileSize) {
  return fileSize <= MAX_FILE_SIZE;
}
