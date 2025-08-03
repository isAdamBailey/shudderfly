// File validation constants and utilities
export const MAX_FILE_SIZE = 62914560; // 60MB
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

// Helper function to check if video needs optimization
export function needsVideoOptimization(file) {
  return file.type.startsWith("video/") && file.size > MAX_FILE_SIZE;
}

// Helper function to check if file type is allowed
export function isAllowedFileType(fileType) {
  return ALLOWED_FILE_TYPES.includes(fileType);
}

// Helper function to check if file size is within limits
export function isFileSizeValid(fileSize) {
  return fileSize <= MAX_FILE_SIZE;
}
