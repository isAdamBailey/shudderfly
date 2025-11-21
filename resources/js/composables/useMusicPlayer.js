import { computed, ref, watch } from "vue";

const STORAGE_KEY = "music_player_state";
const FLYOUT_STORAGE_KEY = "music_flyout_open";
const PLAYBACK_STATE_KEY = "music_playback_state";

// Global state (shared across all components)
const currentSong = ref(null);
const isPlaying = ref(false);
const isFlyoutOpen = ref(false);
const search = ref("");
const filter = ref("");

// Load initial state from localStorage
const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      if (state.currentSong) {
        currentSong.value = state.currentSong;
      }
    }
  } catch (e) {
    console.error("Error loading music state:", e);
  }

  try {
    const flyoutOpen = localStorage.getItem(FLYOUT_STORAGE_KEY);
    if (flyoutOpen !== null) {
      isFlyoutOpen.value = flyoutOpen === "true";
    }
  } catch (e) {
    console.error("Error loading flyout state:", e);
  }
};

// Save state to localStorage
const saveState = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentSong: currentSong.value
      })
    );
  } catch (e) {
    console.error("Error saving music state:", e);
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
watch(currentSong, saveState, { deep: true });
watch(isFlyoutOpen, saveFlyoutState);

// Initialize on module load
loadState();

export function useMusicPlayer() {
  const playSong = (song) => {
    currentSong.value = song;
    if (!isFlyoutOpen.value) {
      isFlyoutOpen.value = true;
    }
  };

  const closePlayer = () => {};

  const stopPlayer = () => {
    currentSong.value = null;
    isPlaying.value = false;
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

  const setPlaying = (playing) => {
    isPlaying.value = playing;
    try {
      localStorage.setItem(
        PLAYBACK_STATE_KEY,
        JSON.stringify({
          isPlaying: playing,
          timestamp: Date.now()
        })
      );
    } catch (e) {}
  };

  const getSavedPlaybackState = () => {
    try {
      const stored = localStorage.getItem(PLAYBACK_STATE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return null;
  };

  const setSearch = (searchValue) => {
    search.value = searchValue || "";
  };

  const setFilter = (filterValue) => {
    filter.value = filterValue || "";
  };

  return {
    // State
    currentSong: computed(() => currentSong.value),
    isPlaying: computed(() => isPlaying.value),
    isFlyoutOpen: computed(() => isFlyoutOpen.value),
    search: computed(() => search.value),
    filter: computed(() => filter.value),

    // Methods
    playSong,
    closePlayer,
    stopPlayer,
    toggleFlyout,
    openFlyout,
    closeFlyout,
    setPlaying,
    setSearch,
    setFilter,
    getSavedPlaybackState
  };
}
