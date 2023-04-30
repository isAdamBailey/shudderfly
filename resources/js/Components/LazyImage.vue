<template>
    <div
        v-if="!isLoading"
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
    <img v-else class="object-cover w-full" :src="src" :alt="alt" />
</template>

<script setup>
import { useImage } from "@vueuse/core";
import { usePage } from "@inertiajs/inertia-vue3";

const { isLoading, error } = useImage({ src: props.src });

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
];
const excuse =
    excusesImagesWontLoad[
        Math.floor(Math.random() * excusesImagesWontLoad.length)
    ];

const props = defineProps({
    src: {
        type: String,
        default: "/img/video-placeholder.png",
    },
    alt: {
        type: String,
        default: "image",
    },
});
</script>

<style scoped></style>
