<template>
    <Head title="Uploads" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center">
                <Link :href="route('pictures.index')">
                    <h2
                        class="font-semibold text-2xl text-gray-900 dark:text-gray-100 leading-tight"
                    >
                        {{ title }}
                    </h2>
                </Link>
                <SearchInput class="m-4" route-name="pictures.index" />
                <Link
                    :href="
                        randomButtonDisabled
                            ? route('pictures.index', { filter: 'random' })
                            : null
                    "
                >
                    <Button
                        :disabled="randomButtonDisabled"
                        @click="randomButtonDisabled = true"
                    >
                        <span class="text-md mr-3">Mix</span>
                        <RoundArrowsIcon />
                    </Button>
                </Link>
            </div>
        </template>

        <PhotosGrid :photos="photos.data" />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import PhotosGrid from "@/Pages/Uploads/UploadsGrid.vue";
import { Head, Link } from "@inertiajs/inertia-vue3";
import RoundArrowsIcon from "@/Components/svg/RoundArrowsIcon.vue";
import Button from "@/Components/Button.vue";
import { ref, computed } from "vue";
import { usePage } from "@inertiajs/inertia-vue3";
import SearchInput from "@/Components/SearchInput.vue";

const props = defineProps({
    photos: Object,
});

const isRandom = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "random";
});

const randomButtonDisabled = ref(false);
const title = computed(() => {
    const search = usePage().props.value.search;
    if (search) {
        return `Farts with "${search}"`;
    }
    return `${props.photos.per_page} ${
        isRandom.value ? "Random" : "Newest"
    } Farts`;
});
</script>
