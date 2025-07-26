import { onMounted, ref } from "vue";

const PROCESSING_KEY = "collage_processing";

export function useCollageProcessing() {
  const processingCollages = ref(new Set());

  // Load processing state from localStorage on mount
  onMounted(() => {
    const stored = localStorage.getItem(PROCESSING_KEY);
    if (stored) {
      try {
        const collageIds = JSON.parse(stored);
        processingCollages.value = new Set(collageIds);
      } catch (e) {
        console.error("Error parsing processing state from localStorage:", e);
        localStorage.removeItem(PROCESSING_KEY);
      }
    }
  });

  // Add collage to processing state
  const startProcessing = (collageId) => {
    processingCollages.value.add(collageId);
    saveToStorage();
  };

  // Remove collage from processing state
  const stopProcessing = (collageId) => {
    processingCollages.value.delete(collageId);
    saveToStorage();
  };

  // Check if collage is being processed
  const isProcessing = (collageId) => {
    if (!collageId) return false;
    return processingCollages.value.has(collageId);
  };

  // Clear all processing state (useful for cleanup)
  const clearProcessing = () => {
    processingCollages.value.clear();
    localStorage.removeItem(PROCESSING_KEY);
  };

  // Save current state to localStorage
  const saveToStorage = () => {
    localStorage.setItem(
      PROCESSING_KEY,
      JSON.stringify([...processingCollages.value])
    );
  };

  return {
    processingCollages,
    startProcessing,
    stopProcessing,
    isProcessing,
    clearProcessing
  };
}
