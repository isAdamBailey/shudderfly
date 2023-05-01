<template>
    <div
        v-if="isLoading"
        class="bg-gray-800 w-full h-36 animate-pulse object-cover text-white flex p-2"
    >
        <span class="m-auto"
            >Sorry {{ username }}! Must be {{ excuse }}...</span
        >
    </div>
    <div
        v-else-if="error"
        class="bg-gray-500 w-full h-36 object-cover text-white flex p-2"
    >
        <span class="m-auto">Swoops!</span>
    </div>
    <img
        v-else
        ref="target"
        class="object-cover w-full"
        :src="imageSrc"
        :alt="alt"
    />
</template>

<script setup>
import { useImage, useIntersectionObserver } from "@vueuse/core";
import { usePage } from "@inertiajs/inertia-vue3";
import { ref } from "vue";

const props = defineProps({
    src: {
        type: String,
        default: null,
    },
    alt: {
        type: String,
        default: "image",
    },
});

// let's make it only lead the image src when it's visible
const target = ref(null);
const placeholderImage = "/img/photo-placeholder.png";
const imageSrc = ref(placeholderImage);
// is this image visible in the viewport?
const isVisible = ref(false);
useIntersectionObserver(
    target,
    ([{ isIntersecting }]) => {
        isVisible.value = isIntersecting;
        imageSrc.value = isIntersecting ? props.src : placeholderImage;
    },
    { threshold: 0.5 }
);

const { isLoading, error } = useImage({ src: imageSrc.value });
const username = usePage().props.value.auth.user.name;
const excusesImagesWontLoad = [
    "the WIFI",
    "the internet",
    "your dad's fault",
    "the neighbors dog",
    "a stinky cockroach",
    "the fly on a hamburger",
    "a dirty diaper",
    "rotten radishes",
    "a madagascar hissing cockroach",
    "that screaming baby",
    "Trump",
    "a fart",
];
const excuse =
    excusesImagesWontLoad[
        Math.floor(Math.random() * excusesImagesWontLoad.length)
    ];
</script>
