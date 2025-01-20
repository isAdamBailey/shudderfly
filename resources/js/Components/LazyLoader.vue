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
            @error="handleMediaError"
        >
            <source :src="imageSrc" type="video/mp4" />
            Your browser does not support the video tag.
        </video>
        <button
            v-if="!isCover && bookId"
            class="absolute top-2 right-2 bg-blue-600/75 hover:bg-blue-700 text-white rounded-full p-2 z-10 backdrop-blur-sm"
            title="Take Snapshot"
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
import { useMedia } from "@/mediaHelpers";
import { useForm } from "@inertiajs/vue3";
import { useImage } from "@vueuse/core";
import { computed, ref } from "vue";

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

const form = useForm({
    book_id: props.bookId,
    video_time: null,
    video_url: null,
});

const handleMediaError = () => {
    imageSrc.value = placeholder;
};

const takeSnapshot = () => {
    if (!videoRef.value) return;
    
    form.video_time = videoRef.value.currentTime;
    form.video_url = imageSrc.value;
    
    form.post(route('pages.snapshot'), {
        preserveScroll: true,
        onSuccess: () => {
        },
        onError: (err) => {
            console.error('Error taking snapshot:', err);
        }
    });
};
</script>
