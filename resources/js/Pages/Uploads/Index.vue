<template>
    <Head title="Uploads" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center p-2">
                <Link class="w-3/4" :href="route('pictures.index')">
                    <h2 class="font-bold text-2xl text-gray-900 leading-tight">
                        {{ title }}
                    </h2>
                </Link>
                <SearchInput route-name="pictures.index" label="Farts" />
            </div>
        </template>

        <div class="p-2 pb-0 flex justify-around">
            <Link
                :href="
                    randomButtonDisabled
                        ? route('pictures.index', { filter: 'random' })
                        : null
                "
            >
                <Button
                    class="rounded-full border-amber-50 dark:border-gray-100 max-h-8"
                    :disabled="randomButtonDisabled"
                    @click="randomButtonDisabled = true"
                >
                    <span class="text-md mr-3">Fart Mix</span>
                    <RoundArrowsIcon />
                </Button>
            </Link>
            <Link
                :href="
                    oldButtonDisabled
                        ? route('pictures.index', { filter: 'old' })
                        : null
                "
            >
                <Button
                    class="rounded-full border-amber-50 dark:border-gray-100 max-h-8"
                    :disabled="oldButtonDisabled"
                    @click="oldButtonDisabled = true"
                >
                    <span class="text-md mr-3">Year Old Farts!</span>
                    <RoundArrowsIcon />
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
import { ref, computed } from "vue";
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

const oldButtonDisabled = ref(false);
const randomButtonDisabled = ref(false);
const title = computed(() => {
    const search = usePage().props.search;
    if (search) {
        return `Farts with "${search}"`;
    }
    if (props.photos.per_page) {
        if (isRandom.value) {
            return `${props.photos.per_page} Random Farts`;
        }
        if (isOld.value) {
            return `${props.photos.per_page} Farts a Year Old`;
        }
    }
    return "Newest Farts";
});
</script>
