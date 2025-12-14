import { computed, ref, watch } from "vue";

const FLYOUT_STORAGE_KEY = "message_builder_flyout_open";

// Global state
const isFlyoutOpen = ref(false);
const addWordFn = ref(null);
const addPhraseFn = ref(null);
const getPreviewFn = ref(null);

// Load initial state from localStorage
const loadState = () => {
  try {
    const flyoutOpen = localStorage.getItem(FLYOUT_STORAGE_KEY);
    if (flyoutOpen !== null) {
      isFlyoutOpen.value = flyoutOpen === "true";
    }
  } catch (e) {
    console.error("Error loading flyout state:", e);
  }
};

// Save flyout state
const saveFlyoutState = () => {
  try {
    localStorage.setItem(FLYOUT_STORAGE_KEY, isFlyoutOpen.value.toString());
  } catch (e) {
    console.error("Error saving flyout state:", e);
  }
};

// Watch for changes and save
watch(isFlyoutOpen, saveFlyoutState);

// Initialize on module load
loadState();

export function useMessageBuilder() {
  const setAddWord = (fn) => {
    addWordFn.value = fn;
  };

  const setAddPhrase = (fn) => {
    addPhraseFn.value = fn;
  };

  const setGetPreview = (fn) => {
    getPreviewFn.value = fn;
  };

  const toggleFlyout = () => {
    isFlyoutOpen.value = !isFlyoutOpen.value;
  };

  const openFlyout = () => {
    isFlyoutOpen.value = true;
  };

  const closeFlyout = () => {
    isFlyoutOpen.value = false;
  };

  return {
    // Flyout state
    isFlyoutOpen: computed(() => isFlyoutOpen.value),
    toggleFlyout,
    openFlyout,
    closeFlyout,

    // Builder functions
    addWord: addWordFn,
    addPhrase: addPhraseFn,
    getPreview: getPreviewFn,
    setAddWord,
    setAddPhrase,
    setGetPreview
  };
}
