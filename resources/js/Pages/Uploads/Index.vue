<template>
    <Head title="Uploads" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center">
                <Link @click="filter()">
                    <h2
                        class="font-heading text-2xl text-gray-100 leading-tight"
                    >
                        {{ title }}
                    </h2>
                </Link>
                <SearchInput route-name="pictures.index" label="Uploads" />
            </div>
        </template>

        <div class="p-2 pb-0 flex flex-wrap justify-around">
            <Button
                type="button"
                :is-active="isPopular"
                class="rounded-full border-amber-50 dark:border-gray-100 my-3 p-10"
                @click="filter('popular')"
            >
                <i class="ri-star-line text-4xl"></i>
            </Button>
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
        <UploadsGrid :photos="photos" />
        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import UploadsGrid from "@/Pages/Uploads/UploadsGrid.vue";
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

const isPopular = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "popular";
});

const title = computed(() => {
    const search = usePage().props.search;
    if (search) {
        return `Pages with "${search}"`;
    }
    if (props.photos.total) {
        const total = props.photos.total;
        if (isRandom.value) {
            return "Mixed";
        }
        if (isOld.value) {
            return "A year ago";
        }
        if (isYouTube.value) {
            return `${total} YouTube videos`;
        }
        if (isPopular.value) {
            return "Your favorites";
        }
    }
    return "Newest uploads";
});

function filter(filter) {
    let phrase = " newest uploads";
    switch (filter) {
        case "youtube":
            phrase = "YouTube videos";
            break;
        case "old":
            phrase = "a year ago";
            break;
        case "random":
            phrase = "mixed";
            break;
        case "popular":
            phrase = "your favorites";
            break;
    }
    speak(phrase);
    router.get(route("pictures.index", { filter }));
}
</script>
