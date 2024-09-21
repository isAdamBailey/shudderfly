<template>
    <img
        v-if="isLoading"
        :class="`${classes} object-cover h-full w-full bg-yellow-300 dark:bg-gray-700`"
        :src="placeholder"
        alt="placeholder image"
    />
    <video
        v-else-if="isVideo(imageSrc)"
        ref="target"
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
        ref="target"
        :class="`${classes} object-cover h-full w-full bg-yellow-300 dark:bg-gray-700`"
        :src="imageSrc"
        :alt="alt"
    />
</template>

<script setup>
import { useIntersectionObserver, useImage } from "@vueuse/core";
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
const target = ref(null);
const imageSrc = ref(placeholder);
const isVisible = ref(false);

useIntersectionObserver(target, ([{ isIntersecting }], observer) => {
    isVisible.value = isIntersecting;
    if (isIntersecting) {
        imageSrc.value = props.src || placeholder;
        observer.unobserve(target.value);
    }
});

watch(target, (newTarget) => {
    if (newTarget && newTarget.tagName === "VIDEO") {
        newTarget.addEventListener("canplay", () => {
            newTarget.currentTime = 0;
        });
    }
});

const { isLoading } = useImage({ src: computed(() => imageSrc.value) });
</script>
