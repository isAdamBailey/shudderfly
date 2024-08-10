<template>
    <div
        class="rounded-lg overflow-hidden bg-gradient-to-r from-white dark:from-gray-700 dark:via-gray-900 to-yellow-100 dark:to-black flex flex-col justify-between"
    >
        <span
            @click.once="incrementReadCount"
            @touchstart.once="incrementReadCount"
        >
            <LazyLoader
                v-if="page.media_path"
                class="rounded-top max-h-[90vh] object-contain"
                :src="page.media_path"
                :alt="page.description"
            />
            <div v-else-if="videoId">
                <VideoWrapper :id="videoId" :title="page.description" />
            </div>
            <div
                class="px-3 py-3 text-gray-900 dark:text-white"
                v-html="page.content"
            ></div>
            <p class="px-3 py-3">
                <span class="text-xs text-gray-900 dark:text-white">
                    {{ short(page.created_at) }}
                </span>
            </p>
        </span>
        <div v-if="hasContent" class="flex justify-center mb-8">
            <Button
                type="button"
                class="flex justify-center w-1/2"
                :disabled="speaking"
                @click="speak(stripHtml(page.content))"
            >
                <span class="text-lg">Read Page</span>
            </Button>
        </div>

        <div v-if="canEditPages">
            <Button
                v-if="!showPageSettings"
                class="w-full rounded-t-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                @click="showPageSettings = true"
            >
                Edit Page
            </Button>
            <Button
                v-else
                class="w-full rounded-b-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                @click="showPageSettings = false"
            >
                Close page settings
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
import { computed, ref } from "vue";
import { router } from "@inertiajs/vue3";
import EditPageForm from "@/Pages/Book/EditPageForm.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useDate } from "@/dateHelpers";
import useGetYouTubeVideo from "@/composables/useGetYouTubeVideo";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
    page: { type: Object, required: true },
    book: { type: Object, required: true },
});

const { videoId } = useGetYouTubeVideo(props.page.video_link);
let showPageSettings = ref(false);

const hasContent = computed(() => stripHtml(props.page.content));

const stripHtml = (html) => {
    if (!html) {
        return "";
    }
    return html.replace(/<\/?[^>]+(>|$)/g, "");
};

function incrementReadCount() {
    if (canEditPages) {
        return;
    }
    router.post(
        route("pages.increment-read-count", { page: props.page }),
        {},
        { preserveScroll: true }
    );
}
</script>
