<template>
    <Head :title="page.book.title" />

    <BreezeAuthenticatedLayout>
        <div
            class="pb-5 overflow-hidden bg-gradient-to-t from-blue-200 to-indigo-700 dark:from-gray-900 dark:to-purple-500 relative"
        >
            <div class="text-center">
                <Link
                    :href="
                        route('books.show', {
                            book: page.book.slug,
                            page: 1,
                        })
                    "
                    class="px-2 py-2 flex justify-center flex-wrap mb-3 border-b-2 border-gray-800 bg-blue-200 dark:bg-gray-300 hover:bg-blue-600 hover:dark:bg-gray-800 text-blue-600 dark:text-gray-800 hover:text-yellow-200 dark:hover:text-white transition"
                >
                    <span class="mr-3 font-heading text-lg">Back to</span>
                    <h2 class="font-heading text-5xl uppercase">
                        {{ page.book.title }}
                    </h2>
                </Link>
                <div class="min-h-[60vh]">
                    <div class="relative mx-3 md:mx-32">
                        <Link
                            v-if="previousPage"
                            :href="route('pages.show', previousPage)"
                            as="button"
                            class="z-10 absolute left-0 mt-60 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 disabled:opacity-25 transition ease-in-out duration-150"
                            aria-label="previous page"
                            :disabled="buttonDisabled"
                            @click="buttonDisabled = true"
                        >
                            <i
                                class="ri-arrow-left-circle-fill text-6xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 hover:dark:bg-white"
                            ></i>
                        </Link>
                        <Link
                            v-if="nextPage"
                            :href="route('pages.show', nextPage)"
                            as="button"
                            class="z-10 absolute right-0 mt-60 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 disabled:opacity-25 transition ease-in-out duration-150"
                            aria-label="next page"
                            :disabled="buttonDisabled"
                            @click="buttonDisabled = true"
                        >
                            <i
                                class="ri-arrow-right-circle-fill text-6xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 hover:dark:bg-white"
                            ></i>
                        </Link>
                    </div>
                    <LazyLoader
                        v-if="page.media_path"
                        class="max-h-[60vh]"
                        :src="page.media_path"
                        :poster="page.media_poster"
                        :alt="page.description"
                    />
                    <VideoWrapper
                        v-else-if="page.video_link"
                        :url="page.video_link"
                        :title="page.description"
                    />
                    <p class="mb-3 text-sm italic dark:text-white">
                        Uploaded on {{ short(page.created_at) }}, viewed
                        {{ Math.round(page.read_count).toLocaleString() }} times
                    </p>
                </div>
                <div
                    v-if="hasContent"
                    class="m-5 flex justify-between bg-blue-200 dark:bg-gray-300 md:rounded-lg p-3 my-3"
                >
                    <div
                        class="page-content px-3 py-3 text-lg text-left"
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
                    :books="books"
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
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
    page: { type: Object, required: true },
    previousPage: { type: Object, required: true },
    nextPage: { type: Object, required: true },
    books: { type: Array, required: true },
});

let showPageSettings = ref(false);
const buttonDisabled = ref(false);

const hasContent = computed(() => stripHtml(props.page.content));

const stripHtml = (html) => {
    if (!html) {
        return "";
    }
    return html.replace(/<\/?[^>]+(>|$)/g, "");
};
</script>
