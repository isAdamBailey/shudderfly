<template>
    <div
        v-if="!imageSrc"
        class="rounded-lg bg-gray-800 h-32 w-full animate-pulse object-cover text-white flex p-2"
    >
        <span class="m-auto"
            >Sorry {{ username }}! Must be {{ excuse }}...</span
        >
    </div>

    <img
        ref="target"
        class="rounded-lg object-cover h-full w-full"
        :src="imageSrc"
        :alt="imageSrc ? alt : null"
    />
</template>

<script setup>
import { useIntersectionObserver } from "@vueuse/core";
import { usePage } from "@inertiajs/inertia-vue3";
import { ref } from "vue";

const props = defineProps({
    src: {
        type: String,
        default: null,
    },
    alt: {
        type: String,
        default: null,
    },
});

// let's make it only lead the image src when it's visible
const target = ref(null);
const imageSrc = ref(null);
// is this image visible in the viewport?
const isVisible = ref(false);
useIntersectionObserver(
    target,
    ([{ isIntersecting }], observer) => {
        isVisible.value = isIntersecting;
        if (isIntersecting) {
            imageSrc.value = props.src;
            observer.unobserve(target.value);
        }
    },
    { threshold: 0.2 }
);

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
