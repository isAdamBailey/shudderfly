<template>
    <Head title="Uploads" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center p-2">
                <Link :href="route('pictures.index')">
                    <h2 class="font-bold text-2xl text-gray-900 leading-tight">
                        {{ title }}
                    </h2>
                </Link>
                <SearchInput route-name="pictures.index" label="Farts" />
            </div>
        </template>

        <div class="p-2 pb-0 flex flex-wrap justify-around">
            <Link :href="route('pictures.index', { filter: 'youtube' })">
                <Button
                    :is-active="isYouTube"
                    class="rounded-full border-amber-50 dark:border-gray-100 max-h-8 my-3"
                >
                    <span class="text-md mr-3">YouTube</span>
                </Button>
            </Link>
            <Link :href="route('pictures.index', { filter: 'random' })">
                <Button
                    :is-active="isRandom"
                    class="rounded-full border-amber-50 dark:border-gray-100 max-h-8 my-3"
                >
                    <span class="text-md mr-3">Fart Mix</span>
                    <RoundArrowsIcon />
                </Button>
            </Link>
            <Link :href="route('pictures.index', { filter: 'old' })">
                <Button
                    :is-active="isOld"
                    class="rounded-full border-amber-50 dark:border-gray-100 max-h-8 my-3"
                >
                    <span class="text-md mr-3">1 Year Ago</span>
                </Button>
            </Link>
        </div>
        <PhotosGrid :photos="photos" />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import PhotosGrid from "@/Pages/Uploads/UploadsGrid.vue";
import { Head, Link } from "@inertiajs/vue3";
import RoundArrowsIcon from "@/Components/svg/RoundArrowsIcon.vue";
import Button from "@/Components/Button.vue";
import { computed } from "vue";
import { usePage } from "@inertiajs/vue3";
import SearchInput from "@/Components/SearchInput.vue";

const props = defineProps({
    photos: Object,
});

const isRandom = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "random";
});

const isOld = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "old";
});

const isYouTube = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "youtube";
});

const title = computed(() => {
    const search = usePage().props.search;
    if (search) {
        return `Farts with "${search}"`;
    }
    if (props.photos.total) {
        const total = props.photos.total;
        if (isRandom.value) {
            return `${total} Random Farts`;
        }
        if (isOld.value) {
            return `${total} Farts a Year Old`;
        }
        if (isYouTube.value) {
            return `${total} YouTube Farts`;
        }
    }
    return "Newest Farts";
});
</script>
