<template>
    <Head title="Uploads" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center p-2">
                <Link @click="filter()">
                    <h2 class="font-bold text-2xl text-gray-900 leading-tight">
                        {{ title }}
                    </h2>
                </Link>
                <SearchInput route-name="pictures.index" label="Pages" />
            </div>
        </template>

        <div class="p-2 pb-0 flex flex-wrap justify-around">
            <Button
                type="button"
                :is-active="isYouTube"
                class="rounded-full border-amber-50 dark:border-gray-100 my-3 p-10"
                @click="filter('youtube')"
            >
                <i class="ri-youtube-line text-4xl"></i>
            </Button>
            <Button
                type="button"
                :is-active="isRandom"
                class="rounded-full border-amber-50 dark:border-gray-100 my-3 p-10"
                @click="filter('random')"
            >
                <i class="ri-dice-line text-4xl"></i>
            </Button>
            <Button
                type="button"
                :is-active="isOld"
                class="rounded-full border-amber-50 dark:border-gray-100 my-3 p-10"
                @click="filter('old')"
            >
                <i class="ri-history-line text-4xl"></i>
            </Button>
        </div>
        <PhotosGrid :photos="photos" />
        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import PhotosGrid from "@/Pages/Uploads/UploadsGrid.vue";
import { Head, Link } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import { computed } from "vue";
import { usePage, router } from "@inertiajs/vue3";
import SearchInput from "@/Components/SearchInput.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";

const { speak } = useSpeechSynthesis();

const props = defineProps({
    photos: { type: Object, required: true },
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
        return `Pages with "${search}"`;
    }
    if (props.photos.total) {
        const total = props.photos.total;
        if (isRandom.value) {
            return `${total} Random Uploads`;
        }
        if (isOld.value) {
            return `${total} Uploads a Year Old`;
        }
        if (isYouTube.value) {
            return `${total} YouTube Videos`;
        }
    }
    return "Newest Uploads";
});

function filter(filter) {
    let phrase = " newest uploads";
    switch (filter) {
        case "youtube":
            phrase = "YouTube videos";
            break;
        case "old":
            phrase = "uploads a year old";
            break;
        case "random":
            phrase = "random uploads";
            break;
    }
    speak(phrase);
    router.get(route("pictures.index", { filter }));
}
</script>
