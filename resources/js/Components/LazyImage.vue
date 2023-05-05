<template>
    <div
        v-if="isLoading"
        class="rounded-lg bg-yellow-300 dark:bg-gray-800 h-32 w-full animate-pulse object-cover text-gray-800 dark:text-white flex p-2"
    >
        <span class="m-auto"
            >Sorry {{ username }}! Must be {{ excuse }}...</span
        >
    </div>
    <img
        v-else
        ref="target"
        class="rounded-lg object-cover h-full w-full"
        :src="imageSrc"
        :alt="alt"
    />
</template>

<script setup>
import { useIntersectionObserver, useImage } from "@vueuse/core";
import { usePage } from "@inertiajs/inertia-vue3";
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
});

// let's make it only lead the image src when it's visible
const target = ref(null);
const imageSrc = ref("/img/photo-placeholder.png");
// is this image visible in the viewport?
const isVisible = ref(false);

useIntersectionObserver(
    target,
    ([{ isIntersecting }], observer) => {
        isVisible.value = isIntersecting;
        if (isIntersecting) {
            imageSrc.value = props.src || "/img/photo-placeholder.png";
            observer.unobserve(target.value);
        }
    },
    { threshold: 0.2 }
);

const { isLoading } = useImage({ src: computed(() => imageSrc.value) });

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
