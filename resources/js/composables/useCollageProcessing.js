import { onMounted, ref } from "vue";

const PROCESSING_KEY = "collage_processing";
const PROCESSING_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useCollageProcessing() {
  const processingCollages = ref(new Map()); // Changed to Map to store timestamps

  // Load processing state from localStorage on mount
  onMounted(() => {
    const stored = localStorage.getItem(PROCESSING_KEY);
    if (stored) {
      try {
        const processingData = JSON.parse(stored);
        // Convert back to Map with timestamps
        processingCollages.value = new Map(Object.entries(processingData));

        // Clean up old entries (older than timeout)
        const cutoffTime = Date.now() - PROCESSING_TIMEOUT;
        for (const [
          collageId,
          timestamp
        ] of processingCollages.value.entries()) {
          if (timestamp < cutoffTime) {
            processingCollages.value.delete(collageId);
          }
        }
        saveToStorage();
      } catch (e) {
        console.error("Error parsing processing state from localStorage:", e);
        localStorage.removeItem(PROCESSING_KEY);
      }
    }
  });

  // Add collage to processing state with timestamp
  const startProcessing = (collageId) => {
    processingCollages.value.set(collageId, Date.now());
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

    const timestamp = processingCollages.value.get(collageId);
    if (!timestamp) return false;

    // Check if the processing state is stale (older than timeout)
    const isStale = Date.now() - timestamp > PROCESSING_TIMEOUT;
    if (isStale) {
      // Automatically clear stale processing state
      processingCollages.value.delete(collageId);
      saveToStorage();
      return false;
    }

    return true;
  };

  // Clear all processing state (useful for cleanup)
  const clearProcessing = () => {
    processingCollages.value.clear();
    localStorage.removeItem(PROCESSING_KEY);
  };

  // Save current state to localStorage
  const saveToStorage = () => {
    // Convert Map to object for localStorage
    const processingObject = Object.fromEntries(processingCollages.value);
    localStorage.setItem(PROCESSING_KEY, JSON.stringify(processingObject));
  };

  return {
    processingCollages,
    startProcessing,
    stopProcessing,
    isProcessing,
    clearProcessing
  };
}
