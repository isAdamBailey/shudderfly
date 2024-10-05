<template>
    <BreezeAuthenticatedLayout>
        <div class="p-4 overflow-hidden">
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
            <div class="text-center">
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
                <div class="flex justify-between">
                    <div
                        class="px-3 py-3 text-lg text-white"
                        v-html="page.content"
                    ></div>
                    <div v-if="hasContent" class="ml-3 mt-3 text-right">
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

                <div class="flex justify-around my-3">
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
                <div class="flex">
                    <Link
                        :href="
                            route('books.show', {
                                book: page.book.slug,
                                page: 1,
                            })
                        "
                        class="flex items-center"
                        ><Button>
                            <i
                                class="ri-arrow-go-back-fill text-xl text-gray-100"
                            ></i>
                            <span class="ml-3 font-bold text-gray-100"
                                >Go to book</span
                            >
                        </Button>
                    </Link>
                </div>
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
