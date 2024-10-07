<template>
    <BreezeAuthenticatedLayout>
        <div class="py-4 md:px-4 overflow-hidden">
            <div class="text-center">
                <Link
                    :href="
                        route('books.show', {
                            book: page.book.slug,
                            page: 1,
                        })
                    "
                    class="flex justify-center flex-wrap mb-3 bg-gray-300 rounded-lg p-3"
                >
                    <span class="mr-3">Back to</span>
                    <h2 class="font-heading text-5xl">
                        {{ page.book.title }}
                    </h2>
                </Link>
                <LazyLoader
                    v-if="page.media_path"
                    class="max-h-[60vh]"
                    :src="page.media_path"
                    :poster="page.media_poster"
                    :alt="page.description"
                />
                <div v-else-if="videoId">
                    <VideoWrapper :id="videoId" :title="page.description" />
                </div>
                <div
                    v-if="hasContent"
                    class="flex justify-between bg-gray-300 rounded-lg p-3 my-3"
                >
                    <div
                        class="px-3 py-3 text-lg text-left"
                        v-html="page.content"
                    ></div>
                    <div class="ml-3 mt-3 text-right">
                        <Button
                            type="button"
                            :disabled="speaking"
                            @click="speak(stripHtml(page.content))"
                        >
                            <i class="ri-speak-fill text-xl"></i>
                        </Button>
                    </div>
                </div>
                <p class="px-3 py-3">
                    <span class="text-xs text-white">
                        {{ short(page.created_at) }}
                    </span>
                </p>

                <div class="flex justify-around mb-10">
                    <Link
                        v-if="previousPage"
                        :href="route('pages.show', previousPage)"
                        as="button"
                        class="inline-flex items-center text-white disabled:opacity-25 transition ease-in-out duration-150"
                        aria-label="previous page"
                        :disabled="backButtonDisabled"
                        @click="backButtonDisabled = true"
                    >
                        <i
                            class="ri-arrow-left-circle-fill text-6xl rounded-full bg-amber-50 text-amber-800 dark:text-gray-900"
                        ></i>
                    </Link>
                    <Link
                        v-if="nextPage"
                        :href="route('pages.show', nextPage)"
                        as="button"
                        class="inline-flex items-center text-white disabled:opacity-25 transition ease-in-out duration-150"
                        aria-label="next page"
                        :disabled="nextButtonDisabled"
                        @click="nextButtonDisabled = true"
                    >
                        <i
                            class="ri-arrow-right-circle-fill text-6xl rounded-full bg-amber-50 text-amber-800 dark:text-gray-900"
                        ></i>
                    </Link>
                </div>
            </div>
            <div v-if="canEditPages" class="mb-3">
                <Button
                    v-if="!showPageSettings"
                    class="w-full rounded-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                    @click="showPageSettings = true"
                >
                    Edit Page
                </Button>
                <Button
                    v-else
                    class="w-full rounded-none bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                    @click="showPageSettings = false"
                >
                    Close page settings
                </Button>
                <EditPageForm
                    v-if="showPageSettings"
                    :page="page"
                    :book="page.book"
                    @close-page-form="showPageSettings = false"
                />
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { computed, ref } from "vue";
import { Head, Link } from "@inertiajs/vue3";
import EditPageForm from "@/Pages/Page/EditPageForm.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useDate } from "@/dateHelpers";
import useGetYouTubeVideo from "@/composables/useGetYouTubeVideo";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
    page: { type: Object, required: true },
    previousPage: { type: Object, required: true },
    nextPage: { type: Object, required: true },
});

const { videoId } = useGetYouTubeVideo(props.page.video_link);
let showPageSettings = ref(false);
const backButtonDisabled = ref(false);
const nextButtonDisabled = ref(false);

const hasContent = computed(() => stripHtml(props.page.content));

const stripHtml = (html) => {
    if (!html) {
        return "";
    }
    return html.replace(/<\/?[^>]+(>|$)/g, "");
};
</script>
