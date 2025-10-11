<template>
    <div
        v-if="currentSong"
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40"
    >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
                class="flex flex-col sm:flex-row items-center py-4 space-y-4 sm:space-y-0 sm:space-x-6"
            >
                <!-- Song Thumbnail with Visualizer Overlay -->
                <div
                    class="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start relative"
                >
                    <img
                        v-if="thumbnailUrl && !imageError"
                        :src="thumbnailUrl"
                        :alt="currentSong.title"
                        class="w-48 h-48 sm:w-56 sm:h-56 rounded-lg object-cover"
                        @error="handleImageError"
                    />
                    <div
                        v-else
                        class="w-48 h-48 sm:w-56 sm:h-56 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                    >
                        <i
                            class="ri-music-2-line text-7xl sm:text-8xl text-gray-400 dark:text-gray-500"
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
                                    animationDuration: `${
                                        0.4 + Math.random() * 0.3
                                    }s`,
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
                            class="text-lg sm:text-xl text-gray-900 dark:text-gray-100 truncate"
                        >
                            {{ currentSong.title }}
                        </h3>
                        <div
                            v-if="currentSong.description"
                            class="mt-1 text-sm text-gray-600 dark:text-gray-300 overflow-hidden whitespace-nowrap"
                        >
                            <p
                                class="animate-marquee inline-block"
                                :style="{
                                    animationDuration: `${Math.max(
                                        10,
                                        currentSong.description.length * 0.1
                                    )}s`,
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
                                            animationDuration: `${
                                                0.5 + Math.random() * 0.3
                                            }s`,
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
                                            width: progressPercentage + '%',
                                        }"
                                    ></div>
                                </div>
                                <span>{{ formatTime(duration) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Playback Controls -->
                    <div
                        class="flex items-center justify-center sm:justify-start space-x-6"
                    >
                        <button
                            class="w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
                            :disabled="isLoading"
                            @click="seekBackward"
                        >
                            <i class="ri-skip-back-mini-fill text-xl"></i>
                        </button>

                        <button
                            class="w-16 h-16 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200"
                            :disabled="isLoading"
                            @click="togglePlayPause"
                        >
                            <i
                                v-if="!isPlaying"
                                class="ri-play-fill text-3xl"
                            ></i>
                            <i v-else class="ri-pause-fill text-3xl"></i>
                        </button>

                        <button
                            class="w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
                            :disabled="isLoading"
                            @click="seekForward"
                        >
                            <i class="ri-skip-forward-mini-fill text-xl"></i>
                        </button>

                        <button
                            class="w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
                            :disabled="isLoading"
                            @click="closePlayer"
                        >
                            <i class="ri-close-line text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Hidden YouTube Player -->
        <div
            v-show="false"
            id="global-music-player"
            class="absolute -top-full -left-full opacity-0 pointer-events-none"
        ></div>

        <!-- Error Message -->
        <div
            v-if="playerError"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
        >
            <div
                class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-sm w-full text-center"
            >
                <h2
                    class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4"
                >
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
import { ref, computed, onUnmounted, watch, nextTick } from "vue";

const props = defineProps({
    currentSong: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(["close", "playing"]);

const player = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const imageError = ref(false);
const playerError = ref(null);
const hasIncrementedReadCount = ref(false);
const isLoading = ref(true);

let updateInterval = null;

const progressPercentage = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

const thumbnailUrl = computed(() => {
    if (!props.currentSong) return null;
    return (
        props.currentSong.thumbnail_url ||
        `https://img.youtube.com/vi/${props.currentSong.youtube_video_id}/maxresdefault.jpg`
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

const togglePlayPause = () => {
    if (!player.value) return;

    if (isPlaying.value) {
        player.value.pauseVideo();
    } else {
        player.value.playVideo();
    }
};

const seekTo = (event) => {
    if (!player.value || duration.value === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration.value;

    player.value.seekTo(seekTime);
};

const seekForward = () => {
    if (!player.value) return;
    const newTime = Math.min(currentTime.value + 10, duration.value);
    player.value.seekTo(newTime);
};

const seekBackward = () => {
    if (!player.value) return;
    const newTime = Math.max(currentTime.value - 10, 0);
    player.value.seekTo(newTime);
};

const closePlayer = () => {
    if (player.value) {
        player.value.destroy();
        player.value = null;
    }
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    clearInterval(updateInterval);
    emit("close");
};

const loadYouTubeAPI = () => {
    return new Promise((resolve) => {
        // Use a global array to store callbacks
        if (!window._onYouTubeIframeAPIReadyCallbacks) {
            window._onYouTubeIframeAPIReadyCallbacks = [];
        }
        window._onYouTubeIframeAPIReadyCallbacks.push(resolve);

        if (window.YT && window.YT.Player) {
            // API already loaded, execute all callbacks
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
    if (!props.currentSong) return;

    isLoading.value = true;
    try {
        await loadYouTubeAPI();

        // Destroy existing player
        if (player.value) {
            player.value.destroy();
            player.value = null;
        }

        player.value = new window.YT.Player("global-music-player", {
            height: "1",
            width: "1",
            videoId: props.currentSong.youtube_video_id,
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
                playsinline: 1,
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError: onPlayerError,
            },
        });
    } catch (error) {
        console.error("Error creating YouTube player:", error);
        playerError.value = "Failed to create video player: " + error.message;
        isLoading.value = false;
    }
};

const onPlayerReady = (event) => {
    console.log("Player ready for:", props.currentSong.title);

    // Get duration
    duration.value = event.target.getDuration();

    // Start time tracking
    updateInterval = setInterval(() => {
        if (player.value && typeof player.value.getCurrentTime === "function") {
            try {
                const currentTimeValue = player.value.getCurrentTime();
                if (!isNaN(currentTimeValue) && currentTimeValue >= 0) {
                    currentTime.value = currentTimeValue;
                }
            } catch (error) {
                console.error("Error getting current time:", error);
            }
        }
    }, 500);

    // Auto-play
    setTimeout(() => {
        if (player.value && typeof player.value.playVideo === "function") {
            try {
                player.value.playVideo();
            } catch (error) {
                console.error("Error calling playVideo():", error);
            }
        }
    }, 1000);

    isLoading.value = false;
};

const onPlayerStateChange = (event) => {
    console.log("Player state changed:", event.data);

    switch (event.data) {
        case window.YT.PlayerState.PLAYING:
            isPlaying.value = true;
            emit("playing", true);
            console.log("Music is now playing!");

            // Increment read count when song starts playing (only once per song)
            if (props.currentSong && !hasIncrementedReadCount.value) {
                incrementReadCount();
            }
            break;
        case window.YT.PlayerState.PAUSED:
            isPlaying.value = false;
            emit("playing", false);
            console.log("Music is paused");
            break;
        case window.YT.PlayerState.BUFFERING:
            console.log("Player is buffering...");
            break;
        case window.YT.PlayerState.ENDED:
            isPlaying.value = false;
            emit("playing", false);
            currentTime.value = 0;
            console.log("Song ended");
            break;
        case window.YT.PlayerState.CUED:
            console.log("Video cued, attempting to play...");
            setTimeout(() => {
                if (
                    player.value &&
                    typeof player.value.playVideo === "function"
                ) {
                    try {
                        player.value.playVideo();
                    } catch (error) {
                        console.error(
                            "Error in cued state playVideo():",
                            error
                        );
                    }
                }
            }, 500);
            break;
    }
};

const onPlayerError = (event) => {
    console.error("YouTube player error:", event.data);
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
    if (!props.currentSong || hasIncrementedReadCount.value) return;

    try {
        await fetch(
            window.route("music.increment-read-count", props.currentSong.id),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content"),
                },
            }
        );

        hasIncrementedReadCount.value = true;
        console.log("Read count incremented for:", props.currentSong.title);
    } catch (error) {
        console.error("Failed to increment read count:", error);
    }
};

// Watch for song changes
watch(
    () => props.currentSong,
    async (newSong, oldSong) => {
        if (newSong && newSong !== oldSong) {
            console.log("Song changed to:", newSong.title);
            playerError.value = null;
            imageError.value = false;
            isPlaying.value = false;
            currentTime.value = 0;
            duration.value = 0;
            hasIncrementedReadCount.value = false; // Reset for new song

            // Clear existing interval
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }

            // Wait for DOM update then create player
            await nextTick();
            createPlayer();
        }
    },
    { immediate: true }
);

onUnmounted(() => {
    if (player.value) {
        player.value.destroy();
        player.value = null;
    }
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
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
