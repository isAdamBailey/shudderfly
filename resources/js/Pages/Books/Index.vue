<template>
    <Head title="Books" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center mb-10">
                <Link class="w-1/4" :href="route('books.index')">
                    <h2
                        class="font-heading text-3xl text-theme-title leading-tight"
                    >
                        {{ title }}
                    </h2>
                </Link>

                <SearchInput route-name="books.index" label="Books" />
            </div>
            <div v-if="canEditPages" class="mb-3 w-full md:w-1/2 mx-auto">
                <Button
                    v-if="!showNewBookForm"
                    class="w-full"
                    @click="showNewBookForm = true"
                >
                    <span class="text-center">Add a new book</span>
                </Button>
                <Button
                    v-else
                    class="w-full !bg-red-700"
                    @click="showNewBookForm = false"
                >
                    Close book form
                </Button>
                <NewBookForm
                    v-if="showNewBookForm"
                    :authors="props.authors"
                    :categories="props.categories"
                    @close-page-form="showNewBookForm = false"
                />
            </div>
        </template>
        <div v-if="!areAllBooksEmpty" class="mb-10">
            <BooksGrid
                v-if="!searchCategories"
                :category="{ name: 'forgotten' }"
                label="Remember these books?"
            />

            <div v-for="(category, index) in workingCategories" :key="index">
                <BooksGrid :category="category" />
            </div>

            <BooksGrid
                v-if="!searchCategories"
                :category="{ name: 'popular' }"
                label="Your favorite books!"
            />
        </div>
        <div v-else class="flex flex-col items-center mt-10">
            <h2
                class="mb-8 font-semibold text-2xl text-gray-100 leading-tight"
            >
                {{ notFoundContent }}
            </h2>
            <ManEmptyCircle />
        </div>
        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import SearchInput from "@/Components/SearchInput.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BooksGrid from "@/Pages/Books/BooksGrid.vue";
import NewBookForm from "@/Pages/Books/NewBookForm.vue";
import { Head, Link, usePage } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const { canEditPages } = usePermissions();
const { speak } = useSpeechSynthesis();
const notFoundContent = "I can't find any books like that";

const props = defineProps({
    categories: {
        type: Array,
        required: true,
    },
    searchCategories: {
        type: Array,
        default: null,
    },
    authors: {
        type: Array,
        required: true,
    },
});

const showNewBookForm = ref(false);
const workingCategories = computed(() => {
    return props.searchCategories || props.categories;
});

const areAllBooksEmpty = computed(() => {
    return workingCategories.value.every(
        (category) => category.books?.length === 0
    );
});

const title = computed(() => {
    const search = usePage().props.search;
    if (search) {
        return `Books with "${search}"`;
    }
    return "Books";
});

watch(
    () => usePage().props.search,
    (newSearch) => {
        if (newSearch && areAllBooksEmpty.value) {
            speak(notFoundContent);
        }
    },
    { immediate: true }
);
</script>
