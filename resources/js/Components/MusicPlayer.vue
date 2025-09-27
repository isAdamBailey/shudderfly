<template>
    <div
        v-if="currentSong"
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40"
    >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center py-4 space-x-4">
                <!-- Song Thumbnail -->
                <div class="flex-shrink-0">
                    <img
                        v-if="thumbnailUrl && !imageError"
                        :src="thumbnailUrl"
                        :alt="currentSong.title"
                        class="w-16 h-16 rounded-lg object-cover"
                        @error="handleImageError"
                    />
                    <div
                        v-else
                        class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                    >
                        <i
                            class="ri-music-2-line text-2xl text-gray-400 dark:text-gray-500"
                        ></i>
                    </div>
                </div>

                <!-- Song Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <h3
                                class="text-xl text-gray-900 dark:text-gray-100 truncate"
                            >
                                {{ currentSong.title }}
                            </h3>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mt-2">
                        <div
                            class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400"
                        >
                            <span>{{ formatTime(currentTime) }}</span>
                            <div
                                class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 cursor-pointer"
                                @click="seekTo"
                            >
                                <div
                                    class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-100"
                                    :style="{ width: progressPercentage + '%' }"
                                ></div>
                            </div>
                            <span>{{ formatTime(duration) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Playback Controls -->
                <div class="flex items-center space-x-2">
                    <button
                        class="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
                        @click="seekBackward"
                    >
                        <i class="ri-skip-back-mini-fill text-lg"></i>
                    </button>

                    <button
                        class="w-10 h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200"
                        @click="togglePlayPause"
                    >
                        <i v-if="!isPlaying" class="ri-play-fill text-xl"></i>
                        <i v-else class="ri-pause-fill text-xl"></i>
                    </button>

                    <button
                        class="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
                        @click="seekForward"
                    >
                        <i class="ri-skip-forward-mini-fill text-lg"></i>
                    </button>

                    <button
                        class="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
                        @click="closePlayer"
                    >
                        <i class="ri-close-line text-lg"></i>
                    </button>
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
    </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, nextTick } from "vue";
import { router } from "@inertiajs/vue3";

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
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            // Script is already loading, wait for it
            const checkYT = () => {
                if (window.YT && window.YT.Player) {
                    resolve();
                } else {
                    setTimeout(checkYT, 100);
                }
            };
            checkYT();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);

        window.onYouTubeIframeAPIReady = () => {
            resolve();
        };
    });
};

const createPlayer = async () => {
    if (!props.currentSong) return;

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
/* Add any component-specific styles here */
</style>
