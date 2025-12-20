import { computed, ref, watch } from "vue";

const FLYOUT_STORAGE_KEY = "message_builder_flyout_open";

// Global state
const isFlyoutOpen = ref(false);
const addWordFn = ref(null);
const addPhraseFn = ref(null);
const getPreviewFn = ref(null);
const activeInputType = ref(null); // 'message' or 'comment'
const commentInputs = ref(new Map()); // Map of messageId -> { addWord, addPhrase, getPreview }
const messageInputFunctions = ref(null); // Store message input functions

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
    activeInputType.value = 'message';
    if (!messageInputFunctions.value) {
      messageInputFunctions.value = {};
    }
    messageInputFunctions.value.addWord = fn;
  };

  const setAddPhrase = (fn) => {
    addPhraseFn.value = fn;
    activeInputType.value = 'message';
    if (!messageInputFunctions.value) {
      messageInputFunctions.value = {};
    }
    messageInputFunctions.value.addPhrase = fn;
  };

  const setGetPreview = (fn) => {
    getPreviewFn.value = fn;
    activeInputType.value = 'message';
    if (!messageInputFunctions.value) {
      messageInputFunctions.value = {};
    }
    messageInputFunctions.value.getPreview = fn;
  };

  const setCommentInput = (messageId, functions) => {
    commentInputs.value.set(messageId, functions);
  };

  const removeCommentInput = (messageId) => {
    commentInputs.value.delete(messageId);
  };

  const setActiveCommentInput = (messageId) => {
    activeInputType.value = 'comment';
    const commentInput = commentInputs.value.get(messageId);
    if (commentInput) {
      addWordFn.value = commentInput.addWord;
      addPhraseFn.value = commentInput.addPhrase;
      getPreviewFn.value = commentInput.getPreview;
    }
  };

  const setActiveMessageInput = () => {
    activeInputType.value = 'message';
    // Restore message input functions if they exist
    if (messageInputFunctions.value) {
      addWordFn.value = messageInputFunctions.value.addWord;
      addPhraseFn.value = messageInputFunctions.value.addPhrase;
      getPreviewFn.value = messageInputFunctions.value.getPreview;
    }
  };

  const getActiveAddWord = () => {
    return addWordFn.value;
  };

  const getActiveAddPhrase = () => {
    return addPhraseFn.value;
  };

  const getActiveGetPreview = () => {
    return getPreviewFn.value;
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

    // Builder functions (for backward compatibility)
    addWord: computed(() => addWordFn.value),
    addPhrase: computed(() => addPhraseFn.value),
    getPreview: computed(() => getPreviewFn.value),
    
    // Setters
    setAddWord,
    setAddPhrase,
    setGetPreview,
    
    // Comment input management
    setCommentInput,
    removeCommentInput,
    setActiveCommentInput,
    setActiveMessageInput,
    
    // Active input getters
    getActiveAddWord,
    getActiveAddPhrase,
    getActiveGetPreview
  };
}
