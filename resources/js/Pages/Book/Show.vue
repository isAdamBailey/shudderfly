<template>
    <Head :title="book.title" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <Link :href="pages.first_page_url" class="w-full">
                <div class="flex justify-between flex-wrap">
                    <div class="flex items-center">
                        <img
                            v-if="book.cover_image?.image_path"
                            class="object-cover max-h-12 rounded mr-2"
                            :src="book.cover_image.image_path"
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
                            {{ pages.total }} farts
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
                    class="rounded-none font-bold px-12"
                    :class="settingsOpen ? 'bg-pink-800 dark:bg-pink-800' : ''"
                    @click="settingsOpen = !settingsOpen"
                >
                    <span v-if="settingsOpen">Close</span>
                    <span v-else>Add/Edit</span>
                </Button>
            </div>
        </div>
        <div v-if="canEditPages && settingsOpen" class="w-full mt-4 md:ml-2">
            <div>
                <BreezeValidationErrors class="mb-4" />
            </div>
            <div class="flex flex-col md:flex-row justify-around">
                <NewPageForm :book="book" @close-form="settingsOpen = false" />
                <EditForm :book="book" :authors="authors" />
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
            class="flex justify-around pb-20 mt-5"
        >
            <Link
                :href="pages.prev_page_url || pages.last_page_url"
                as="button"
                :disabled="prevButtonDisabled"
                class="inline-flex items-center px-8 py-4 bg-yellow-900 dark:bg-gray-800 border border-transparent dark:border-gray-500 rounded-md text-white hover:bg-yellow-700 active:bg-blue-900 focus:outline-none focus:border-blue-900 focus:shadow-outline-blue disabled:opacity-25 transition ease-in-out duration-150"
                aria-label="previous page"
                @click="prevButtonDisabled = true"
            >
                <ArrowIcon class="rotate-180" />
            </Link>
            <Link
                :href="pages.next_page_url || pages.first_page_url"
                as="button"
                :disabled="nextButtonDisabled"
                class="inline-flex items-center px-8 py-4 bg-yellow-900 dark:bg-gray-800 border border-transparent dark:border-gray-500 rounded-md text-white hover:bg-yellow-700 active:bg-blue-900 focus:outline-none focus:border-blue-900 focus:shadow-outline-blue disabled:opacity-25 transition ease-in-out duration-150"
                aria-label="next page"
                @click="nextButtonDisabled = true"
            >
                <ArrowIcon />
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
import EditForm from "@/Pages/Book/EditBookForm.vue";
import { usePermissions } from "@/permissions";
import Page from "@/Pages/Book/Page.vue";
import ArrowIcon from "@/Components/svg/ArrowIcon.vue";
import { useDate } from "@/dateHelpers";

const { canEditPages } = usePermissions();
const { short } = useDate();

const props = defineProps({
    book: Object,
    pages: Object,
    authors: Array,
});

const prevButtonDisabled = ref(false);
const nextButtonDisabled = ref(false);
let settingsOpen = ref(false);

onMounted(() => {
    if (props.pages.total === 0) {
        settingsOpen.value = true;
    }
});
</script>
