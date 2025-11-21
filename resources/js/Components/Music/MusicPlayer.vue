<template>
  <div
    v-if="currentSong"
    class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
  >
    <div class="px-4 py-3">
      <div
        class="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4"
      >
        <!-- Song Thumbnail with Visualizer Overlay -->
        <div
          class="flex-shrink-0 flex justify-center sm:justify-start relative"
        >
          <img
            v-if="thumbnailUrl && !imageError"
            :src="thumbnailUrl"
            :alt="currentSong.title"
            class="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover"
            @error="handleImageError"
          />
          <div
            v-else
            class="w-32 h-32 sm:w-40 sm:h-40 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
          >
            <i
              class="ri-music-2-line text-5xl sm:text-6xl text-gray-400 dark:text-gray-500"
            ></i>
          </div>

          <!-- Visualizer Overlay -->
          <div
            v-if="isPlaying"
            class="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none"
          >
            <div class="flex items-end space-x-1 h-16">
              <div
                v-for="i in 20"
                :key="i"
                class="visualizer-bar bg-blue-500/70 dark:bg-blue-400/70 w-1 rounded-full"
                :style="{
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: `${0.4 + Math.random() * 0.3}s`
                }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Song Info and Controls Container -->
        <div class="flex-1 w-full min-w-0 space-y-4">
          <!-- Song Info -->
          <div class="text-center sm:text-left">
            <h3
              class="text-base sm:text-lg text-gray-900 dark:text-gray-100 truncate"
            >
              {{ currentSong.title }}
            </h3>
            <div
              v-if="currentSong.description"
              class="mt-1 text-xs text-gray-600 dark:text-gray-300 overflow-hidden whitespace-nowrap"
            >
              <p
                class="animate-marquee inline-block"
                :style="{
                  animationDuration: `${Math.max(
                    10,
                    currentSong.description.length * 0.1
                  )}s`
                }"
              >
                {{ currentSong.description }}
              </p>
            </div>

            <!-- Progress Bar with Inline Visualizer -->
            <div class="mt-2">
              <div
                class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400"
              >
                <span>{{ formatTime(currentTime) }}</span>

                <!-- Mini Visualizer next to progress bar -->
                <div
                  v-if="isPlaying"
                  class="flex items-center space-x-0.5 px-2"
                >
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="visualizer-bar-small bg-blue-500 dark:bg-blue-400 w-0.5 rounded-full"
                    :style="{
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: `${0.5 + Math.random() * 0.3}s`
                    }"
                  ></div>
                </div>

                <div
                  class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 cursor-pointer"
                  @click="seekTo"
                >
                  <div
                    class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-100"
                    :style="{
                      width: progressPercentage + '%'
                    }"
                  ></div>
                </div>
                <span>{{ formatTime(duration) }}</span>
              </div>
            </div>
          </div>

          <!-- Playback Controls -->
          <div
            class="flex items-center justify-center sm:justify-start space-x-4"
          >
            <button
              class="w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
              :disabled="isLoading"
              @click="seekBackward"
            >
              <i class="ri-skip-back-mini-fill text-lg"></i>
            </button>

            <button
              class="w-12 h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200"
              :disabled="isLoading"
              @click="togglePlayPause"
            >
              <i v-if="!isPlaying" class="ri-play-fill text-2xl"></i>
              <i v-else class="ri-pause-fill text-2xl"></i>
            </button>

            <button
              class="w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
              :disabled="isLoading"
              @click="seekForward"
            >
              <i class="ri-skip-forward-mini-fill text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="playerError"
      class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-sm w-full text-center"
      >
        <h2 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Error
        </h2>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">
          {{ playerError }}
        </p>
        <button
          class="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white text-sm py-2 px-4 rounded transition-colors duration-200"
          @click="playerError = null"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Loading Overlay (only covers the player, not the whole page) -->
    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-20 rounded-lg"
      style="pointer-events: all"
    >
      <div class="flex flex-col items-center">
        <i
          class="ri-loader-4-line animate-spin text-blue-600 text-4xl mb-2"
        ></i>
        <span class="text-white text-sm">Loading song...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const {
  currentSong,
  isPlaying: globalIsPlaying,
  setPlaying,
  getSavedPlaybackState
} = useMusicPlayer();

if (!window.__globalMusicPlayer) window.__globalMusicPlayer = null;
if (!window.__globalMusicUpdateInterval)
  window.__globalMusicUpdateInterval = null;
if (!window.__lastPlayedSongId) window.__lastPlayedSongId = null;

const globalPlayer = () => window.__globalMusicPlayer;
const setGlobalPlayer = (player) => {
  window.__globalMusicPlayer = player;
};
const globalUpdateInterval = () => window.__globalMusicUpdateInterval;
const setGlobalUpdateInterval = (interval) => {
  window.__globalMusicUpdateInterval = interval;
};
const getLastPlayedSongId = () => window.__lastPlayedSongId;
const setLastPlayedSongId = (id) => {
  window.__lastPlayedSongId = id;
};

const currentTime = ref(0);
const duration = ref(0);
const imageError = ref(false);
const playerError = ref(null);
const hasIncrementedReadCount = ref(false);
const isLoading = ref(true);

const isPlaying = computed(() => globalIsPlaying.value);

const progressPercentage = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

const thumbnailUrl = computed(() => {
  if (!currentSong.value) return null;
  return (
    currentSong.value.thumbnail_high || currentSong.value.thumbnail_default
  );
});

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const handleImageError = () => {
  imageError.value = true;
};

const togglePlayPause = async () => {
  let player = globalPlayer();

  if (!player && currentSong.value) {
    await createPlayer();
    await new Promise((resolve) => setTimeout(resolve, 500));
    player = globalPlayer();
  }

  if (!player) return;

  try {
    const playerState = player.getPlayerState();
    if (playerState === window.YT.PlayerState.PLAYING) {
      player.pauseVideo();
      setPlaying(false);
    } else {
      player.playVideo();
      setPlaying(true);
    }
  } catch (error) {
    console.error("Error toggling play/pause:", error);
    if (currentSong.value) {
      try {
        player.destroy();
      } catch (e) {
        // Player may already be destroyed
      }
      setGlobalPlayer(null);
      await createPlayer();
    }
  }
};

const seekTo = (event) => {
  const player = globalPlayer();
  if (!player || duration.value === 0) return;

  try {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration.value;

    player.seekTo(seekTime, true);
  } catch (error) {
    console.error("Error seeking:", error);
  }
};

const seekForward = () => {
  const player = globalPlayer();
  if (!player) return;
  try {
    const newTime = Math.min(currentTime.value + 10, duration.value);
    player.seekTo(newTime, true);
  } catch (error) {
    console.error("Error seeking forward:", error);
  }
};

const seekBackward = () => {
  const player = globalPlayer();
  if (!player) return;
  try {
    const newTime = Math.max(currentTime.value - 10, 0);
    player.seekTo(newTime, true);
  } catch (error) {
    console.error("Error seeking backward:", error);
  }
};

const loadYouTubeAPI = () => {
  return new Promise((resolve) => {
    if (!window._onYouTubeIframeAPIReadyCallbacks) {
      window._onYouTubeIframeAPIReadyCallbacks = [];
    }
    window._onYouTubeIframeAPIReadyCallbacks.push(resolve);

    if (window.YT && window.YT.Player) {
      while (window._onYouTubeIframeAPIReadyCallbacks.length) {
        window._onYouTubeIframeAPIReadyCallbacks.shift()();
      }
      return;
    }

    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = function () {
        while (window._onYouTubeIframeAPIReadyCallbacks.length) {
          window._onYouTubeIframeAPIReadyCallbacks.shift()();
        }
      };
    }

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
};

const createPlayer = async () => {
  if (!currentSong.value) return;

  const player = globalPlayer();

  if (player) {
    try {
      const currentVideoId = player.getVideoData()?.video_id;
      if (currentVideoId === currentSong.value.youtube_video_id) {
        isLoading.value = false;
        try {
          if (
            isPlaying.value &&
            player.getPlayerState() !== window.YT.PlayerState.PLAYING
          ) {
            player.playVideo();
          }
        } catch (e) {
          // Player may be in transition
        }
        return;
      }
      try {
        player.destroy();
      } catch (e) {
        // Player may already be destroyed
      }
      setGlobalPlayer(null);
    } catch (error) {
      isLoading.value = false;
      return;
    }
  }

  let playerElement = document.getElementById("global-music-player");
  if (!playerElement) {
    playerElement = document.createElement("div");
    playerElement.id = "global-music-player";
    playerElement.style.cssText =
      "position: fixed; top: -9999px; left: -9999px; opacity: 0; pointer-events: none;";
    document.body.appendChild(playerElement);
  }

  isLoading.value = true;
  try {
    await loadYouTubeAPI();

    const existingInterval = globalUpdateInterval();
    if (existingInterval) {
      clearInterval(existingInterval);
      setGlobalUpdateInterval(null);
    }

    const newPlayer = new window.YT.Player("global-music-player", {
      height: "1",
      width: "1",
      videoId: currentSong.value.youtube_video_id,
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 0,
        cc_load_policy: 0,
        iv_load_policy: 3,
        autohide: 1,
        autoplay: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        playsinline: 1
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });

    setGlobalPlayer(newPlayer);
  } catch (error) {
    playerError.value = "Failed to create video player";
    isLoading.value = false;
  }
};

const onPlayerReady = (event) => {
  const player = event.target;

  try {
    duration.value = player.getDuration();
  } catch (error) {
    // Duration may not be available yet
  }

  const existingInterval = globalUpdateInterval();
  if (!existingInterval) {
    const interval = setInterval(() => {
      const currentPlayer = globalPlayer();
      if (currentPlayer && typeof currentPlayer.getCurrentTime === "function") {
        try {
          const currentTimeValue = currentPlayer.getCurrentTime();
          if (!isNaN(currentTimeValue) && currentTimeValue >= 0) {
            currentTime.value = currentTimeValue;
          }
        } catch (error) {
          // Skip this update
        }
      }
    }, 500);
    setGlobalUpdateInterval(interval);
  }

  setTimeout(() => {
    const currentPlayer = globalPlayer();
    if (currentPlayer && typeof currentPlayer.playVideo === "function") {
      try {
        currentPlayer.playVideo();
      } catch (error) {
        // Auto-play may fail
      }
    }
  }, 1000);

  isLoading.value = false;
};

const onPlayerStateChange = (event) => {
  switch (event.data) {
    case window.YT.PlayerState.PLAYING:
      setPlaying(true);
      if (currentSong.value && !hasIncrementedReadCount.value) {
        incrementReadCount();
      }
      break;
    case window.YT.PlayerState.PAUSED:
      setPlaying(false);
      break;
    case window.YT.PlayerState.BUFFERING:
      break;
    case window.YT.PlayerState.ENDED:
      setPlaying(false);
      currentTime.value = 0;
      break;
    case window.YT.PlayerState.CUED:
      setTimeout(() => {
        const player = globalPlayer();
        if (player && typeof player.playVideo === "function") {
          try {
            player.playVideo();
          } catch (error) {
            // Play may fail
          }
        }
      }, 500);
      break;
  }
};

const onPlayerError = (event) => {
  let errorMessage = "This video cannot be played.";

  switch (event.data) {
    case 2:
      errorMessage = "Invalid video ID.";
      break;
    case 5:
      errorMessage = "HTML5 player error.";
      break;
    case 100:
      errorMessage = "Video not found or private.";
      break;
    case 101:
    case 150:
      errorMessage = "Video cannot be played in embedded players.";
      break;
  }

  playerError.value = errorMessage;
};

const incrementReadCount = async () => {
  if (!currentSong.value || hasIncrementedReadCount.value) return;

  try {
    // eslint-disable-next-line no-undef
    await fetch(route("music.increment-read-count", currentSong.value.id), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": document
          .querySelector('meta[name="csrf-token"]')
          .getAttribute("content")
      }
    });

    hasIncrementedReadCount.value = true;
  } catch (error) {
    // Read count increment may fail
  }
};

watch(
  () => currentSong.value?.id,
  async (newSongId) => {
    if (!newSongId) return;

    const player = globalPlayer();
    const lastSongId = getLastPlayedSongId();

    if (newSongId === lastSongId && player) {
      try {
        const playerState = player.getPlayerState();
        if (playerState === window.YT.PlayerState.PLAYING) {
          setPlaying(true);
        } else if (playerState === window.YT.PlayerState.PAUSED) {
          setPlaying(false);
        }
        duration.value = player.getDuration();
        currentTime.value = player.getCurrentTime();
        isLoading.value = false;
      } catch (error) {
        isLoading.value = false;
      }
      return;
    }

    if (player) {
      try {
        const currentVideoId = player.getVideoData()?.video_id;
        const newVideoId = currentSong.value?.youtube_video_id;

        if (currentVideoId === newVideoId) {
          setLastPlayedSongId(newSongId);
          try {
            const playerState = player.getPlayerState();
            if (playerState === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
            } else if (playerState === window.YT.PlayerState.PAUSED) {
              setPlaying(false);
            }
            duration.value = player.getDuration();
            currentTime.value = player.getCurrentTime();
            isLoading.value = false;
          } catch (error) {
            isLoading.value = false;
          }
          return;
        }
      } catch (error) {
        if (newSongId === lastSongId) {
          isLoading.value = false;
          return;
        }
      }
    }

    setLastPlayedSongId(newSongId);
    playerError.value = null;
    imageError.value = false;
    setPlaying(false);
    currentTime.value = 0;
    duration.value = 0;
    hasIncrementedReadCount.value = false;

    await nextTick();
    createPlayer();
  },
  { immediate: true }
);

onMounted(() => {
  const player = globalPlayer();
  if (currentSong.value && player) {
    try {
      const savedState = getSavedPlaybackState();
      const playerState = player.getPlayerState();

      if (playerState === window.YT.PlayerState.PLAYING) {
        setPlaying(true);
      } else if (playerState === window.YT.PlayerState.PAUSED) {
        setPlaying(false);
      } else if (savedState && savedState.isPlaying) {
        try {
          player.playVideo();
          setPlaying(true);
        } catch (e) {
          // Playback restoration may fail
        }
      }

      duration.value = player.getDuration();
      currentTime.value = player.getCurrentTime();
      isLoading.value = false;
    } catch (error) {
      isLoading.value = false;
    }
  }
});

onUnmounted(() => {
  // Player persists across routes
});
</script>

<style scoped>
.animate-marquee {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
  animation: marquee linear infinite;
}

@keyframes marquee {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

/* Visualizer animations */
.visualizer-bar {
  animation: visualizer ease-in-out infinite alternate;
}

@keyframes visualizer {
  0% {
    height: 8px;
  }
  100% {
    height: 64px;
  }
}

.visualizer-bar-small {
  animation: visualizer-small ease-in-out infinite alternate;
  height: 4px;
}

@keyframes visualizer-small {
  0% {
    height: 2px;
  }
  100% {
    height: 12px;
  }
}
</style>
