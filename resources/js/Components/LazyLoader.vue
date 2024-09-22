<template>
    <img
        v-if="isLoading"
        :class="`${classes} object-cover h-full w-full bg-yellow-300 dark:bg-gray-700`"
        :src="placeholder"
        alt="placeholder image"
        loading="lazy"
    />
    <video
        v-else-if="isVideo(imageSrc)"
        ref="video"
        :controls="!isCover"
        disablepictureinpicture
        controlslist="nodownload"
        preload="metadata"
        class="h-full w-full rounded-lg object-cover"
    >
        <source :src="imageSrc" />
        Your browser does not support the video tag.
    </video>
    <img
        v-else
        ref="image"
        :class="`${classes} object-cover h-full w-full bg-yellow-300 dark:bg-gray-700`"
        :src="imageSrc"
        :alt="alt"
        loading="lazy"
    />
</template>

<script setup>
import { useImage } from "@vueuse/core";
import { ref, computed, watch } from "vue";
import { useMedia } from "@/mediaHelpers";

const { isVideo } = useMedia();

const props = defineProps({
    src: {
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
});

const placeholder = "/img/photo-placeholder.png";
const video = ref(null);
const imageSrc = ref(props.src || placeholder);

watch(video, (newVideo) => {
    if (newVideo) {
        newVideo.addEventListener("loadedmetadata", () => {
            newVideo.currentTime = 0;
        });
    }
});

const { isLoading } = useImage({ src: computed(() => imageSrc.value) });
</script>
