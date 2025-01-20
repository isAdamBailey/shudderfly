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
            @error="handleMediaError"
        >
            <source :src="imageSrc" type="video/mp4" />
            Your browser does not support the video tag.
        </video>
        <Button
            v-if="!isCover && bookId"
            class="absolute top-2 right-2 h-8"
            title="Take Snapshot"
            :disabled="isOnCooldown || !canTakeSnapshot"
            @click="takeSnapshot"
        >
            <i class="ri-camera-line text-xl"></i>
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
import { useMedia } from "@/mediaHelpers";
import { useForm } from "@inertiajs/vue3";
import { useImage } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";

const { isVideo } = useMedia();
const videoRef = ref(null);

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
});

const placeholder = "/img/photo-placeholder.png";
const imageSrc = ref(props.src || placeholder);
const { isLoading } = useImage({ src: computed(() => imageSrc.value) });

const COOLDOWN_MINUTES = 10;
const COOLDOWN_KEY = 'global_snapshot_cooldown';
const isOnCooldown = ref(false);

onMounted(() => {
    checkCooldown();
});

const form = useForm({
    book_id: props.bookId,
    video_time: null,
    video_url: null,
});

const canTakeSnapshot = ref(false);

const handleMediaError = () => {
    imageSrc.value = placeholder;
};

const handleTimeUpdate = () => {
    if (!videoRef.value) return;
    canTakeSnapshot.value = videoRef.value.currentTime > 0;
};

const checkCooldown = () => {
    const lastSnapshot = localStorage.getItem(COOLDOWN_KEY);
    if (lastSnapshot) {
        const cooldownEnds = new Date(parseInt(lastSnapshot));
        const now = new Date();
        if (now < cooldownEnds) {
            isOnCooldown.value = true;
            // Set timeout to re-enable button when cooldown ends
            setTimeout(() => {
                isOnCooldown.value = false;
                localStorage.removeItem(COOLDOWN_KEY);
            }, cooldownEnds - now);
        } else {
            // Clean up expired cooldown
            localStorage.removeItem(COOLDOWN_KEY);
        }
    }
};

const takeSnapshot = () => {
    if (!canTakeSnapshot.value || isOnCooldown.value) return;
    
    // Set global cooldown timestamp
    const cooldownEnds = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
    localStorage.setItem(COOLDOWN_KEY, cooldownEnds.getTime().toString());
    isOnCooldown.value = true;
    
    form.video_time = videoRef.value.currentTime;
    form.video_url = imageSrc.value;
    
    form.post(route('pages.snapshot'), {
        preserveScroll: true,
        onSuccess: () => {
            console.log('Snapshot taken');
        },
        onError: (err) => {
            // Reset cooldown on error
            localStorage.removeItem(COOLDOWN_KEY);
            isOnCooldown.value = false;
            console.error('Error taking snapshot:', err);
        }
    });
};
</script>
