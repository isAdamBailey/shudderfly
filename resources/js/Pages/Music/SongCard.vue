<template>
    <div
        class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
        <!-- Thumbnail / Player Display -->
        <div class="relative aspect-video bg-gray-200">
            <!-- Always show thumbnail -->
            <img
                v-if="thumbnailUrl && !imageError"
                :src="thumbnailUrl"
                :alt="song.title"
                class="w-full h-full object-cover"
                @error="handleImageError"
                @load="imageLoaded = true"
            />

            <!-- Default thumbnail placeholder -->
            <div v-else class="w-full h-full flex items-center justify-center">
                <div class="text-center">
                    <svg
                        class="w-12 h-12 text-gray-400 mx-auto mb-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M18 3a1 1 0 00-1.196-.98L5 3.73a1 1 0 00-.804.98V14a1 1 0 001 1h13a1 1 0 001-1V3zM9 12a1 1 0 102 0 1 1 0 00-2 0zm3-8a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <p class="text-xs text-gray-500">
                        {{ song.channel_title }}
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                        No thumbnail available
                    </p>
                </div>
            </div>

            <!-- Duration overlay -->
            <div
                v-if="formattedDuration && !showPlayer"
                class="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded"
            >
                {{ formattedDuration }}
            </div>

            <!-- Play button overlay (when not playing) -->
            <div
                v-if="!showPlayer"
                class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50"
            >
                <button
                    class="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors duration-200"
                    @click="startPlayer"
                >
                    <svg
                        class="w-8 h-8 text-white ml-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                        />
                    </svg>
                </button>
            </div>

            <!-- Custom Audio Player Controls Overlay (when playing) -->
            <div
                v-if="showPlayer"
                class="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center p-4"
            >
                <!-- Now Playing Indicator -->
                <div class="text-white text-center mb-4">
                    <div class="text-sm opacity-75 mb-1">Now Playing</div>
                    <div class="font-medium text-lg line-clamp-2">
                        {{ song.title }}
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full mb-4">
                    <div
                        class="flex items-center space-x-2 text-xs text-white mb-2"
                    >
                        <span>{{ formatTime(currentTime) }}</span>
                        <div
                            class="flex-1 bg-white bg-opacity-30 rounded-full h-2 cursor-pointer"
                            @click="seekTo"
                        >
                            <div
                                class="bg-white h-2 rounded-full transition-all duration-100"
                                :style="{ width: progressPercentage + '%' }"
                            ></div>
                        </div>
                        <span>{{ formatTime(duration) }}</span>
                    </div>
                </div>

                <!-- Playback Controls -->
                <div class="flex items-center justify-center space-x-6">
                    <button
                        class="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center transition-all duration-200"
                        @click="seekBackward"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"
                            />
                        </svg>
                    </button>

                    <button
                        class="w-14 h-14 bg-white hover:bg-opacity-90 text-gray-800 rounded-full flex items-center justify-center transition-all duration-200"
                        @click="togglePlayPause"
                    >
                        <svg
                            v-if="!isPlaying"
                            class="w-6 h-6 ml-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                            />
                        </svg>
                        <svg
                            v-else
                            class="w-6 h-6"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </button>

                    <button
                        class="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center transition-all duration-200"
                        @click="seekForward"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z"
                            />
                        </svg>
                    </button>
                </div>

                <!-- Close Button -->
                <button
                    class="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200"
                    @click="closePlayer"
                >
                    <svg
                        class="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            <!-- Hidden YouTube Player -->
            <div
                v-show="false"
                :id="`player-${song.id}`"
                class="absolute -top-full -left-full opacity-0 pointer-events-none"
            ></div>
        </div>

        <!-- Song Info -->
        <div class="p-4">
            <h3
                class="font-semibold text-gray-900 mb-2 line-clamp-2"
                :title="song.title"
            >
                {{ song.title }}
            </h3>

            <p v-if="song.channel_title" class="text-sm text-gray-600 mb-2">
                {{ song.channel_title }}
            </p>

            <p
                v-if="song.description && showDescription"
                class="text-sm text-gray-700 mb-3 line-clamp-3"
            >
                {{ song.description }}
            </p>

            <div
                class="flex items-center justify-between text-xs text-gray-500"
            >
                <span v-if="song.published_at">
                    {{ formatDate(song.published_at) }}
                </span>
                <span v-if="song.view_count > 0">
                    {{ formatViews(song.view_count) }} views
                </span>
            </div>

            <!-- Tags -->
            <div
                v-if="song.tags && song.tags.length > 0"
                class="mt-3 flex flex-wrap gap-1"
            >
                <span
                    v-for="tag in song.tags.slice(0, 3)"
                    :key="tag"
                    class="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                >
                    #{{ tag }}
                </span>
                <span v-if="song.tags.length > 3" class="text-xs text-gray-500">
                    +{{ song.tags.length - 3 }} more
                </span>
            </div>

            <!-- Action Buttons -->
            <div class="mt-4 flex gap-2">
                <button
                    v-if="!showPlayer"
                    class="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded transition-colors duration-200"
                    @click="startPlayer"
                >
                    Play Audio
                </button>
                <button
                    v-else
                    :class="[
                        'flex-1 text-white text-sm py-2 px-3 rounded transition-colors duration-200',
                        isPlaying
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-green-600 hover:bg-green-700',
                    ]"
                    @click="togglePlayPause"
                >
                    {{ isPlaying ? "Pause" : "Resume" }}
                </button>
                <button
                    class="text-gray-600 hover:text-gray-800 text-sm py-2 px-3 border border-gray-300 rounded transition-colors duration-200"
                    @click="toggleDescription"
                >
                    {{ showDescription ? "Less" : "More" }}
                </button>
            </div>
        </div>

        <!-- Error Message (for player errors) -->
        <div
            v-if="playerError"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
        >
            <div
                class="bg-white rounded-lg shadow-md p-6 max-w-sm w-full text-center"
            >
                <h2 class="text-lg font-semibold text-red-600 mb-4">Error</h2>
                <p class="text-sm text-gray-700 mb-4">
                    {{ playerError }}
                </p>
                <button
                    class="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded transition-colors duration-200"
                    @click="playerError = null"
                >
                    Close
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps({
    song: {
        type: Object,
        required: true,
    },
});

const showDescription = ref(false);
const showPlayer = ref(false);
const player = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const imageError = ref(false);
const imageLoaded = ref(false);
const playerError = ref(null);

const progressPercentage = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

let updateInterval = null;

const formattedDuration = computed(() => {
    if (!props.song.duration) return null;

    // YouTube duration format is PT#M#S or PT#H#M#S
    const match = props.song.duration.match(
        /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    );
    if (!match) return null;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
});

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const formatViews = (views) => {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + "M";
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + "K";
    }
    return views.toString();
};

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const startPlayer = () => {
    // Clear any previous errors
    playerError.value = null;
    showPlayer.value = true;
    // Load YouTube Player API if not already loaded
    if (!window.YT) {
        loadYouTubeAPI();
    } else {
        createPlayer();
    }
};

const closePlayer = () => {
    if (player.value) {
        player.value.destroy();
        player.value = null;
    }
    showPlayer.value = false;
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    clearInterval(updateInterval);
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

const loadYouTubeAPI = () => {
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        createPlayer();
        return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);

    window.onYouTubeIframeAPIReady = () => {
        createPlayer();
    };
};

const createPlayer = () => {
    const playerId = `player-${props.song.id}`;

    console.log(
        "Creating YouTube player for:",
        props.song.title,
        "Video ID:",
        props.song.youtube_video_id
    );

    // Ensure the container element exists
    const container = document.getElementById(playerId);
    if (!container) {
        console.error("Player container not found:", playerId);
        return;
    }

    try {
        player.value = new window.YT.Player(playerId, {
            height: "1",
            width: "1",
            videoId: props.song.youtube_video_id,
            playerVars: {
                controls: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                fs: 0,
                cc_load_policy: 0,
                iv_load_policy: 3,
                autohide: 1,
                autoplay: 0,
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

        console.log("YouTube player created successfully");
    } catch (error) {
        console.error("Error creating YouTube player:", error);
        playerError.value = "Failed to create video player: " + error.message;
    }
};

const onPlayerReady = (event) => {
    console.log("YouTube player ready");

    // Get and set duration immediately
    const videoDuration = event.target.getDuration();
    duration.value = videoDuration;
    console.log("Video duration set to:", videoDuration);

    // Start updating time with more frequent updates and better error handling
    updateInterval = setInterval(() => {
        if (player.value && typeof player.value.getCurrentTime === "function") {
            try {
                const currentTimeValue = player.value.getCurrentTime();
                if (!isNaN(currentTimeValue) && currentTimeValue >= 0) {
                    currentTime.value = currentTimeValue;
                    console.log(
                        "Current time updated:",
                        currentTimeValue,
                        "of",
                        duration.value
                    );
                }
            } catch (error) {
                console.error("Error getting current time:", error);
            }
        }
    }, 500); // Update every 500ms for smoother progress

    // Force play after a delay to ensure player is fully loaded
    setTimeout(() => {
        if (player.value && typeof player.value.playVideo === "function") {
            console.log("Attempting to start playback...");
            try {
                player.value.playVideo();
                console.log("playVideo() called successfully");
            } catch (error) {
                console.error("Error calling playVideo():", error);
            }
        }
    }, 1000);
};

const onPlayerStateChange = (event) => {
    console.log("Player state changed:", event.data, "Constants:", {
        UNSTARTED: window.YT?.PlayerState?.UNSTARTED,
        ENDED: window.YT?.PlayerState?.ENDED,
        PLAYING: window.YT?.PlayerState?.PLAYING,
        PAUSED: window.YT?.PlayerState?.PAUSED,
        BUFFERING: window.YT?.PlayerState?.BUFFERING,
        CUED: window.YT?.PlayerState?.CUED,
    });

    // Update playing state
    isPlaying.value = event.data === window.YT.PlayerState.PLAYING;

    // Handle different player states
    switch (event.data) {
        case window.YT.PlayerState.ENDED:
            isPlaying.value = false;
            currentTime.value = 0;
            break;

        case window.YT.PlayerState.PLAYING:
            console.log("Music is now playing!");
            break;

        case window.YT.PlayerState.PAUSED:
            console.log("Music is paused");
            break;

        case window.YT.PlayerState.BUFFERING:
            console.log("Player is buffering...");
            break;

        case window.YT.PlayerState.CUED:
            console.log("Video cued, attempting to play...");
            // Try to play when video is cued
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

        case window.YT.PlayerState.UNSTARTED:
            console.log("Player unstarted, will attempt to play soon...");
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
            errorMessage =
                "This video cannot be embedded. The owner has restricted playback on external sites.";
            break;
        default:
            errorMessage = `Video playback error (${event.data}). This video may not be available.`;
    }

    // Set error message and close player
    playerError.value = errorMessage;
    closePlayer();
};

const toggleDescription = () => {
    showDescription.value = !showDescription.value;
};

const handleImageError = (event) => {
    console.log("Image failed to load:", event.target.src);
    imageError.value = true;
    event.target.style.display = "none";
};

onUnmounted(() => {
    if (player.value) {
        player.value.destroy();
    }
    clearInterval(updateInterval);
});
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
