<template>
    <Head :title="book.title" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <SearchInput route-name="books.search" label="Books" class="mb-2" />
            <Link :href="pages.first_page_url" class="w-full">
                <div class="flex justify-between flex-wrap">
                    <div class="flex items-center">
                        <img
                            v-if="book.cover_image?.media_path"
                            class="object-cover max-h-12 rounded mr-2"
                            :src="book.cover_image.media_path"
                            alt="cover image"
                        />
                        <h2
                            class="font-bold text-2xl text-gray-900 leading-tight"
                        >
                            {{ book.title.toUpperCase() }}
                        </h2>
                    </div>
                    <div>
                        <p
                            v-if="book.author"
                            class="mr-3 font-bold text-gray-100"
                        >
                            by: {{ book.author }}
                        </p>
                        <p class="text-xs text-gray-100">
                            {{ short(book.created_at) }}
                        </p>
                        <p class="text-xs text-gray-100">
                            {{ pages.total }} pages
                        </p>
                    </div>
                </div>
            </Link>
        </template>

        <div
            :class="
                canEditPages && !book.excerpt
                    ? 'justify-end'
                    : 'justify-between'
            "
            class="p-2 flex flex-nowrap align-middle bg-yellow-200 dark:bg-gray-800"
        >
            <div v-if="book.excerpt">
                <h2
                    class="italic text-sm text-gray-900 dark:text-gray-100 leading-tight"
                >
                    {{ book.excerpt }}
                </h2>
            </div>
            <div v-if="canEditPages">
                <Button
                    class="mb-3 md:mb-0 rounded-none font-bold px-12 bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                    @click="togglePageSettings"
                >
                    <span v-if="pageSettingsOpen">Close</span>
                    <span v-else>Add Page</span>
                </Button>
                <Button
                    class="md:ml-4 rounded-none font-bold px-12 bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                    @click="toggleBookSettings"
                >
                    <span v-if="bookSettingsOpen">Close</span>
                    <span v-else>Edit Book</span>
                </Button>
            </div>
        </div>
        <div
            v-if="canEditPages && pageSettingsOpen"
            class="w-full mt-4 md:ml-2"
        >
            <div>
                <BreezeValidationErrors class="mb-4" />
            </div>
            <div class="flex flex-col md:flex-row justify-around">
                <NewPageForm
                    :book="book"
                    @close-form="pageSettingsOpen = false"
                />
            </div>
        </div>

        <div
            v-if="canEditPages && bookSettingsOpen"
            class="w-full mt-4 md:ml-2"
        >
            <div>
                <BreezeValidationErrors class="mb-4" />
            </div>
            <div class="flex flex-col md:flex-row justify-around">
                <EditBookForm
                    :book="book"
                    :authors="authors"
                    @close-form="bookSettingsOpen = false"
                />
            </div>
        </div>

        <div v-if="pages.total > 0" class="flex justify-around mt-3">
            <p
                class="border border-gray-900 rounded-full w-8 h-8 text-sm text-center dark:text-white pt-1.5 bg-yellow-100 dark:bg-gray-800 font-bold"
            >
                {{ pages.from }}
            </p>
            <p
                v-if="pages.from !== pages.to"
                class="border border-gray-900 rounded-full w-8 h-8 text-sm text-center dark:text-white pt-1.5 bg-yellow-100 dark:bg-gray-800 font-bold"
            >
                {{ pages.to }}
            </p>
        </div>

        <div
            class="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(22rem,1fr))] gap-2 pt-3 md:p-3"
        >
            <div
                v-for="page in pages.data"
                :key="page.id"
                class="overflow-hidden"
            >
                <Page :page="page" :book="book" />
            </div>
        </div>
        <div
            v-if="pages.per_page < pages.total"
            class="flex justify-around pb-10 mt-5"
        >
            <Link
                :href="pages.prev_page_url || pages.last_page_url"
                as="button"
                :disabled="prevButtonDisabled"
                class="inline-flex items-center text-white disabled:opacity-25 transition ease-in-out duration-150"
                aria-label="previous page"
                @click="prevButtonDisabled = true"
            >
                <i
                    class="ri-arrow-left-circle-fill text-7xl rounded-full bg-amber-50 text-amber-800 dark:text-gray-900"
                ></i>
            </Link>
            <Link
                :href="centerPageUrl"
                as="button"
                class="inline-flex items-center text-white transition ease-in-out duration-150"
                aria-label="center page"
            >
                <i
                    class="ri-contract-left-right-fill border-4 text-6xl rounded-full text-amber-50 dark:text-gray-100 bg-amber-800 dark:bg-gray-800"
                ></i>
            </Link>
            <Link
                :href="pages.next_page_url || pages.first_page_url"
                as="button"
                :disabled="nextButtonDisabled"
                class="inline-flex items-center text-white disabled:opacity-25 transition ease-in-out duration-150"
                aria-label="next page"
                @click="nextButtonDisabled = true"
            >
                <i
                    class="ri-arrow-right-circle-fill text-7xl rounded-full bg-amber-50 text-amber-800 dark:text-gray-900"
                ></i>
            </Link>
        </div>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import { Head, Link } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import { onMounted, ref } from "vue";
import NewPageForm from "@/Pages/Book/NewPageForm.vue";
import EditBookForm from "@/Pages/Book/EditBookForm.vue";
import { usePermissions } from "@/composables/permissions";
import Page from "@/Pages/Book/Page.vue";
import { useDate } from "@/dateHelpers";
import SearchInput from "@/Components/SearchInput.vue";

const { canEditPages } = usePermissions();
const { short } = useDate();

const props = defineProps({
    book: Object,
    pages: Object,
    authors: Array,
});

const centerPageNumber = Math.ceil(props.pages.total / 2 / 2);
const centerPageUrl = `${props.pages.path}?page=${centerPageNumber}`;
const prevButtonDisabled = ref(false);
const nextButtonDisabled = ref(false);
let pageSettingsOpen = ref(false);
let bookSettingsOpen = ref(false);

const togglePageSettings = () => {
    pageSettingsOpen.value = !pageSettingsOpen.value;
    if (bookSettingsOpen.value) {
        bookSettingsOpen.value = false;
    }
};

const toggleBookSettings = () => {
    bookSettingsOpen.value = !bookSettingsOpen.value;
    if (pageSettingsOpen.value) {
        pageSettingsOpen.value = false;
    }
};

onMounted(() => {
    if (props.pages.total === 0) {
        pageSettingsOpen.value = true;
    }
});
</script>
