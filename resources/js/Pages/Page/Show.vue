<template>
    <Head :title="page.book.title" />

    <BreezeAuthenticatedLayout>
        <div
            class="pb-5 overflow-hidden bg-gray-900 relative"
        >
            <div class="text-center">
                <BookTitle :book="page.book" />
                <div class="relative min-h-[60vh] mt-10">
                    <div class="w-full flex items-center justify-center relative">
                        <Link
                            v-if="previousPage"
                            prefectch="hover"
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
                        <div v-if="page.media_path" class="rounded-lg overflow-hidden mx-16 md:mx-20">
                            <LazyLoader
                                :src="page.media_path"
                                :poster="page.media_poster"
                                :alt="page.description"
                                :book-id="page.book.id"
                                :page-id="page.id"
                                :object-fit="'contain'"
                            />
                        </div>
                        <div v-else-if="page.video_link" class="w-full max-w-4xl mx-16 md:mx-20">
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
                <div
                    v-if="hasContent"
                    class="mx-5 mt-8 mb-5 relative z-20"
                >
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
        </div>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BookTitle from "@/Components/BookTitle.vue";
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useDate } from "@/dateHelpers";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import EditPageForm from "@/Pages/Page/EditPageForm.vue";
import { Head, Link } from "@inertiajs/vue3";
import { computed, ref } from "vue";

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
