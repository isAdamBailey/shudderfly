<template>
    <Head title="Uploads" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center">
                <button @click="filter()">
                    <h2
                        class="font-heading text-2xl text-theme-title leading-tight"
                    >
                        {{ title }}
                    </h2>
                </button>
                <SearchInput
                    class="max-w-80"
                    route-name="pictures.index"
                    label="Uploads"
                />
            </div>
        </template>

        <div class="p-2 pb-0 flex flex-wrap justify-around">
            <Button
                type="button"
                :is-active="isPopular"
                :disabled="loading"
                class="rounded-full my-3"
                @click="filter('popular')"
            >
                <i class="ri-star-line text-4xl"></i>
            </Button>
            <Button
                v-if="isYouTubeEnabled"
                type="button"
                :is-active="isYouTube"
                :disabled="loading"
                class="rounded-full my-3"
                @click="filter('youtube')"
            >
                <i class="ri-youtube-line text-4xl"></i>
            </Button>
            <Button
                v-if="isSnapshotEnabled"
                type="button"
                :is-active="isSnapshot"
                :disabled="loading"
                class="rounded-full my-3"
                @click="filter('snapshot')"
            >
                <i class="ri-camera-line text-4xl"></i>
            </Button>
            <Button
                type="button"
                :is-active="isRandom"
                :disabled="loading"
                class="rounded-full my-3"
                @click="filter('random')"
            >
                <i class="ri-dice-line text-4xl"></i>
            </Button>
            <Button
                type="button"
                :is-active="isOld"
                :disabled="loading"
                class="rounded-full my-3"
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
import Button from "@/Components/Button.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import SearchInput from "@/Components/SearchInput.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import UploadsGrid from "@/Pages/Uploads/UploadsGrid.vue";
import { Head, router, usePage } from "@inertiajs/vue3";
import { computed, ref } from "vue";

const { speak } = useSpeechSynthesis();

defineProps({
    photos: { type: Object, required: true },
});

const isYouTubeEnabled = computed(() => usePage().props.settings["youtube_enabled"]);
const isSnapshotEnabled = computed(() => usePage().props.settings["snapshot_enabled"]);

const loading = ref(false);

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

const isSnapshot= computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "snapshot";
});

const isPopular = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "popular";
});

const title = computed(() => {
    const search = usePage().props.search;
    if (search) {
        return `Uploads with "${search}"`;
    }
    if (isRandom.value) {
        return "Mixed";
    }
    if (isOld.value) {
        return "Memories";
    }
    if (isYouTube.value) {
        return "YouTube videos";
    }
    if (isSnapshot.value) {
        return "Screenshots";
    }
    if (isPopular.value) {
        return "Your favorites";
    }
    return "Newest uploads";
});

function filter(filter) {
    loading.value = true;
    let phrase = " newest uploads";
    switch (filter) {
        case "youtube":
            phrase = "YouTube videos";
            break;
        case "old":
            phrase = "memories from a year ago";
            break;
        case "random":
            phrase = "mixed memories";
            break;
        case "popular":
            phrase = "your favorite memories";
            break;
        case "snapshot":
            phrase = "your screenshots";
            break;
    }
    speak(phrase);
    router.get(route("pictures.index", { filter }));
}
</script>
