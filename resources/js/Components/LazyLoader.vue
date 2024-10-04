<template>
    <img
        v-if="isLoading"
        :src="placeholder"
        class="rounded-lg inline-block"
        alt="placeholder image"
        loading="lazy"
    />
    <video
        v-else-if="isVideo(imageSrc)"
        :controls="!isCover"
        disablepictureinpicture
        controlslist="nodownload"
        :poster="poster"
        class="rounded-lg inline-block"
    >
        <source :src="imageSrc" />
        Your browser does not support the video tag.
    </video>
    <img
        v-else
        ref="image"
        class="rounded-lg inline-block"
        :src="imageSrc"
        :alt="alt"
        loading="lazy"
    />
</template>

<script setup>
import { useImage } from "@vueuse/core";
import { ref, computed } from "vue";
import { useMedia } from "@/mediaHelpers";

const { isVideo } = useMedia();

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
});

const placeholder = "/img/photo-placeholder.png";
const imageSrc = ref(props.src || placeholder);

const { isLoading } = useImage({ src: computed(() => imageSrc.value) });
</script>
