<template>
    <div
        class="max-w-[50vw] rounded-lg overflow-hidden bg-gradient-to-r from-white dark:from-gray-700 dark:via-gray-900 to-yellow-100 dark:to-black flex flex-col justify-between"
    >
        <video
            v-if="isVideo(page.image_path)"
            controls
            preload="none"
            poster="/img/video-placeholder.png"
            class="rounded-top max-h-[50vh] object-contain"
        >
            <source :src="page.image_path" />
            Your browser does not support the video tag.
        </video>

        <LazyImage
            v-else-if="page.image_path"
            class="rounded-top max-h-[50vh] object-contain"
            :src="page.image_path"
            :alt="page.description"
        />
        <div
            class="px-3 py-3 text-gray-900 dark:text-white"
            v-html="page.content"
        ></div>
        <p class="px-3 py-3">
            <span class="text-xs text-gray-900 dark:text-white">
                First written {{ short(page.created_at) }}
            </span>
            <span v-if="isEdited(page)" class="pl-1 text-xs text-gray-400">
                Edited
            </span>
        </p>
        <div v-if="canEditPages">
            <Button
                v-if="!showPageSettings"
                class="w-full rounded-t-none"
                @click="showPageSettings = true"
            >
                Edit Page
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
import LazyImage from "@/Components/LazyImage.vue";
import { usePermissions } from "@/permissions";
import { useMedia } from "@/mediaHelpers";
import { useDate } from "@/dateHelpers";

const { canEditPages } = usePermissions();
const { isVideo } = useMedia();
const { short } = useDate();

defineProps({
    page: Object,
    book: Object,
});

let showPageSettings = ref(false);

function isEdited(page) {
    return page.updated_at !== page.created_at;
}
</script>
