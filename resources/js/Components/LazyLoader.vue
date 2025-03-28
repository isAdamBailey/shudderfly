<template>
    <img
        v-if="isLoading"
        :src="placeholder"
        class="rounded-lg inline-block"
        alt="placeholder image"
        loading="lazy"
    />
    <div v-else-if="isVideo(imageSrc)" class="relative inline-block">
        <video
            ref="videoRef"
            :controls="!isCover"
            disablepictureinpicture
            controlslist="nodownload"
            :poster="poster"
            class="rounded-lg max-h-[75vh] max-w-full h-auto"
            playsinline
            @timeupdate="handleTimeUpdate"
            @play="handlePlayPause"
            @pause="handlePlayPause"
            @error="handleMediaError"
        >
            <source :src="imageSrc" type="video/mp4" />
            Your browser does not support the video tag.
        </video>
        <Button
            v-if="!isCover && bookId && $page.props.settings.snapshot_enabled"
            class="absolute top-0 right-0 h-8 w-8 flex items-center justify-center"
            title="Take Snapshot"
            :disabled="!canTakeSnapshot || !isPaused"
            @click="takeSnapshot"
        >
            <i :class="`${isOnCooldown ? 'ri-speak-fill' : 'ri-camera-line'} text-3xl`"></i>
        </button>
    </div>
    <img
        v-else
        ref="image"
        class="rounded-lg inline-block"
        :src="imageSrc"
        :alt="alt"
        loading="lazy"
        @error="handleMediaError"
    />
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { useSnapshotCooldown } from '@/composables/useSnapshotCooldown';
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useMedia } from "@/mediaHelpers";
import { useForm, usePage } from "@inertiajs/vue3";
import { useImage } from "@vueuse/core";
import { computed, ref } from "vue";

const { isVideo } = useMedia();
const videoRef = ref(null);
const { speak } = useSpeechSynthesis();
const user = usePage().props.auth.user;

const props = defineProps({
    src: {
        type: String,
        default: null,
    },
    poster: {
        type: String,
        default: null,
    },
    alt: {
        type: String,
        default: "image",
    },
    classes: {
        type: String,
        default: "rounded-lg",
    },
    isCover: {
        type: Boolean,
        default: false,
    },
    bookId: {
        type: String,
        default: null,
    },
    pageId: {
        type: String,
        default: null,
    },
});

const placeholder = "/img/photo-placeholder.png";
const imageSrc = ref(props.src || placeholder);
const { isLoading } = useImage({ src: computed(() => imageSrc.value) });

const { isOnCooldown, setCooldown, resetCooldown, remainingMinutes } = useSnapshotCooldown();

const form = useForm({
    book_id: props.bookId,
    page_id: props.pageId,
    video_time: null,
    video_url: null,
});

const canTakeSnapshot = ref(false);
const isPaused = ref(true);

const handleMediaError = () => {
    imageSrc.value = placeholder;
};

const handlePlayPause = () => {
    if (!videoRef.value) return;
    isPaused.value = videoRef.value.paused;
};

const handleTimeUpdate = () => {
    if (!videoRef.value) return;
    canTakeSnapshot.value = videoRef.value.currentTime > 0;
};

const takeSnapshot = () => {
    if (!canTakeSnapshot.value) return;
    if (isOnCooldown.value) {
        const timeMessage = remainingMinutes.value <= 1 
            ? 'less than one minute' 
            : `${remainingMinutes.value} minutes`;
        speak(`Please wait ${timeMessage} before taking another screenshot`);
        return;
    }
    setCooldown();
    canTakeSnapshot.value = false;
    
    // Get the current video source URL
    const videoElement = videoRef.value;
    const videoSource = videoElement?.querySelector('source');
    const videoUrl = videoSource?.src || imageSrc.value;
    
    if (!videoUrl || !videoElement?.currentTime) {
        resetCooldown();
        canTakeSnapshot.value = true;
        return;
    }
    
    form.video_time = videoElement.currentTime;
    form.video_url = videoUrl;
    
    form.post(route('pages.snapshot'), {
        preserveScroll: true,
        onSuccess: () => {
            speak(`I got your screenshot, ${user.name}. please wait a few minutes for it to be uploaded`);
        },
        onError: (err) => {
            resetCooldown();
            canTakeSnapshot.value = true;
            console.error('Error taking snapshot:', err);
        }
    });
};
</script>
