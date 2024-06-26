<template>
    <div
        class="rounded-lg overflow-hidden bg-gradient-to-r from-white dark:from-gray-700 dark:via-gray-900 to-yellow-100 dark:to-black flex flex-col justify-between"
    >
        <LazyLoader
            v-if="page.media_path"
            class="rounded-top max-h-[90vh] object-contain"
            :src="page.media_path"
            :alt="page.description"
        />
        <div v-else-if="embedUrl" class="video-container">
            <iframe
                :title="page.description"
                :src="embedUrl"
                frameborder="0"
                allow="accelerometer; encrypted-media;"
            ></iframe>
        </div>
        <div
            class="px-3 py-3 text-gray-900 dark:text-white"
            v-html="page.content"
        ></div>
        <p class="px-3 py-3">
            <span class="text-xs text-gray-900 dark:text-white">
                {{ short(page.created_at) }}
            </span>
            <span v-if="isEdited(page)" class="pl-1 text-xs text-gray-400">
                Edited
            </span>
        </p>
        <div v-if="canEditPages">
            <Button
                v-if="!showPageSettings"
                class="w-full rounded-t-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                @click="showPageSettings = true"
            >
                Edit Fart
            </Button>
            <Button
                v-else
                class="w-full rounded-b-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                @click="showPageSettings = false"
            >
                Close fart settings
            </Button>
            <EditPageForm
                v-if="showPageSettings"
                :page="page"
                :book="book"
                @close-page-form="showPageSettings = false"
            />
        </div>
    </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { ref } from "vue";
import EditPageForm from "@/Pages/Book/EditPageForm.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import { usePermissions } from "@/permissions";
import { useDate } from "@/dateHelpers";
import useGetYouTubeVideo from "@/composables/useGetYouTubeVideo";

const { canEditPages } = usePermissions();
const { short } = useDate();

const props = defineProps({
    page: Object,
    book: Object,
});

let showPageSettings = ref(false);
const { embedUrl } = useGetYouTubeVideo(props.page.video_link);

function isEdited(page) {
    return page.updated_at !== page.created_at;
}
</script>

<style scoped>
.video-container {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* For a 16:9 aspect ratio */
    overflow: hidden;
}

.video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
</style>
