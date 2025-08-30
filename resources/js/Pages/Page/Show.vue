<template>
    <Head :title="page.book.title" />

    <BreezeAuthenticatedLayout>
        <div class="relative">
            <div
                class="w-full pl-2 sm:pl-6 lg:pl-8 pt-2 sticky top-0 z-30 text-left"
            >
                <div class="flex items-center gap-3 min-w-0">
                    <Link
                        class="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-600 text-white dark:bg-white dark:text-gray-900 hover:bg-blue-500 dark:hover:bg-gray-100 shadow focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-w-0 max-w-[90vw] sm:max-w-[70vw] md:max-w-[60vw] lg:max-w-[50vw]"
                        :href="route('books.show', page.book)"
                        prefetch="hover"
                        :aria-label="`Back to Book: ${page.book.title}`"
                    >
                        <i class="ri-book-2-fill text-lg"></i>
                        <span
                            class="flex-1 basis-0 min-w-0 truncate font-heading uppercase text-base md:text-lg font-semibold"
                            :title="page.book.title"
                        >
                            {{ page.book.title }}
                        </span>
                    </Link>
                </div>
            </div>

            <div class="text-center">
                <div class="relative min-h-[60vh]">
                    <div
                        class="w-full flex items-center justify-center relative"
                    >
                        <Link
                            v-if="previousPage"
                            prefetch="hover"
                            :href="route('pages.show', previousPage)"
                            as="button"
                            class="z-10 absolute left-3 md:left-8 top-1/2 transform -translate-y-1/2 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150"
                            aria-label="previous page"
                            :disabled="buttonDisabled"
                            @click="buttonDisabled = true"
                        >
                            <i
                                class="ri-arrow-left-circle-fill text-6xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 christmas:bg-christmas-red hover:dark:bg-white"
                            ></i>
                        </Link>
                        <Link
                            v-if="nextPage"
                            prefetch="hover"
                            :href="route('pages.show', nextPage)"
                            as="button"
                            class="z-10 absolute right-3 md:right-8 top-1/2 transform -translate-y-1/2 inline-flex items-center text-white hover:text-blue-600 hover:dark:text-gray-800 hover:christmas:text-christmas-gold disabled:opacity-25 transition ease-in-out duration-150"
                            aria-label="next page"
                            :disabled="buttonDisabled"
                            @click="buttonDisabled = true"
                        >
                            <i
                                class="ri-arrow-right-circle-fill text-6xl rounded-full bg-blue-600 hover:bg-white dark:bg-gray-800 christmas:bg-christmas-red hover:dark:bg-white"
                            ></i>
                        </Link>
                        <div
                            v-if="page.media_path"
                            class="rounded-lg overflow-hidden mx-16 md:mx-20"
                        >
                            <LazyLoader
                                :src="page.media_path"
                                :poster="page.media_poster"
                                :alt="page.description"
                                :book-id="page.book.id"
                                :page-id="page.id"
                                :object-fit="'contain'"
                            />
                        </div>
                        <div
                            v-else-if="page.video_link"
                            class="w-full max-w-4xl mx-16 md:mx-20"
                        >
                            <VideoWrapper
                                :url="page.video_link"
                                :title="page.description"
                            />
                        </div>
                    </div>
                    <p
                        v-if="canEditPages"
                        class="w-full mb-3 text-sm italic text-white"
                    >
                        Uploaded on {{ short(page.created_at) }}, viewed
                        {{ Math.round(page.read_count).toLocaleString() }} times
                    </p>
                </div>
                <div v-if="hasContent" class="mx-5 mt-8 mb-5 relative z-20">
                    <div class="text-container">
                        <div
                            class="font-content page-content max-w-5xl mx-auto text-lg text-left relative"
                            v-html="page.content"
                        ></div>
                        <div class="flex justify-end mt-6">
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
            <div class="my-4">
                <AddToCollageButton
                    v-if="canAddToCollage"
                    :page-id="props.page.id"
                    :collages="props.collages"
                />
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import AddToCollageButton from "@/Components/AddToCollageButton.vue";
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useDate } from "@/dateHelpers";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useMedia } from "@/mediaHelpers";
import EditPageForm from "@/Pages/Page/EditPageForm.vue";
import { Head, Link } from "@inertiajs/vue3";
import { computed, ref } from "vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();
const { isVideo } = useMedia();

const props = defineProps({
    page: { type: Object, required: true },
    previousPage: { type: Object, required: true },
    nextPage: { type: Object, required: true },
    books: { type: Array, required: true },
    collages: { type: Array, required: true },
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

const canAddToCollage = computed(() => {
    return (
        props.page.media_path &&
        !isVideo(props.page.media_path) &&
        !props.page.video_link &&
        props.collages.length > 0
    );
});
</script>
