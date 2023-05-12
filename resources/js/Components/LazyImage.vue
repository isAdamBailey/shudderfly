<template>
    <img
        v-if="isLoading"
        :class="`${classes} object-cover h-full w-full dark:bg-gray-700`"
        :src="placeholder"
        alt="placeholder image"
    />
    <img
        v-else
        ref="target"
        :class="`${classes} object-cover h-full w-full dark:bg-gray-700`"
        :src="imageSrc"
        :alt="alt"
    />
</template>

<script setup>
import { useIntersectionObserver, useImage } from "@vueuse/core";
import { ref, computed } from "vue";

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

const { isLoading } = useImage({ src: computed(() => imageSrc.value) });
</script>
