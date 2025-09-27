<template>
    <div
        class="flex items-center p-4 bg-white hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors duration-200"
        @click="$emit('play', song)"
    >
        <!-- Thumbnail -->
        <div class="flex-shrink-0 mr-4">
            <img
                v-if="thumbnailUrl && !imageError"
                :src="thumbnailUrl"
                :alt="song.title"
                class="w-16 h-16 rounded-lg object-cover"
                @error="handleImageError"
            />
            <div
                v-else
                class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center"
            >
                <i class="ri-music-2-line text-2xl text-gray-400"></i>
            </div>
        </div>

        <!-- Song Info -->
        <div class="flex-1 min-w-0">
            <h3 class="text-base font-medium text-gray-900 truncate mb-1">
                {{ song.title }}
            </h3>
            <p class="text-sm text-gray-600 truncate mb-1">
                {{ song.channel_title }}
            </p>
            <div class="flex items-center text-xs text-gray-500 space-x-4">
                <span v-if="song.published_at">
                    {{ formatDate(song.published_at) }}
                </span>
                <span v-if="song.view_count > 0">
                    {{ formatViews(song.view_count) }} views
                </span>
                <span v-if="formattedDuration">
                    {{ formattedDuration }}
                </span>
            </div>
        </div>

        <!-- Play Button -->
        <div class="flex-shrink-0 ml-4">
            <div
                class="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                :class="{ 'bg-green-600 hover:bg-green-700': isCurrentSong && isPlaying }"
            >
                <i
                    v-if="!isCurrentSong || !isPlaying"
                    class="ri-play-fill text-lg"
                ></i>
                <i
                    v-else
                    class="ri-pause-fill text-lg"
                ></i>
            </div>
        </div>

        <!-- Currently Playing Indicator -->
        <div
            v-if="isCurrentSong"
            class="flex-shrink-0 ml-2"
        >
            <div class="flex items-center space-x-1">
                <div
                    v-for="i in 3"
                    :key="i"
                    class="w-1 bg-blue-600 rounded-full animate-pulse"
                    :class="isPlaying ? 'h-4' : 'h-2'"
                    :style="{ animationDelay: `${i * 0.1}s` }"
                ></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
    song: {
        type: Object,
        required: true,
    },
    currentSong: {
        type: Object,
        default: null,
    },
    isPlaying: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['play']);

const imageError = ref(false);

const isCurrentSong = computed(() => {
    return props.currentSong && props.currentSong.id === props.song.id;
});

const thumbnailUrl = computed(() => {
    return props.song.thumbnail_url ||
           `https://img.youtube.com/vi/${props.song.youtube_video_id}/maxresdefault.jpg`;
});

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

const handleImageError = () => {
    imageError.value = true;
};
</script>
