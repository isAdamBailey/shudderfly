<template>
    <Head title="Books" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center mb-2">
                <Link class="w-1/2" :href="route('books.index')">
                    <h2
                        class="font-heading text-3xl text-theme-title leading-tight"
                    >
                        {{ title }}
                    </h2>
                </Link>

                <Button
                    v-if="canEditPages"
                    type="button"
                    @click="openNewBookForm"
                >
                    <i class="ri-add-line mr-1.5 text-base"></i>
                    {{ t("book.new_book_title") }}
                </Button>
            </div>

            <FormModal
                v-if="canEditPages"
                :show="showNewBookForm"
                :title="t('book.new_book_title')"
                :submit-ref="newBookFormRef"
                @close="showNewBookForm = false"
            >
                <NewBookForm
                    ref="newBookFormRef"
                    :authors="authors"
                    :categories="categories"
                    @close-form="showNewBookForm = false"
                />
            </FormModal>
        </template>
        <div
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10"
        >
            <!-- Themed Books Section -->
            <BooksGrid
                v-if="currentTheme && !searchCategories"
                :category="{ name: 'themed' }"
                :label="themeLabel"
            />

            <!-- Current Month Books Section (server sends no label when a theme is active) -->
            <BooksGrid
                v-if="monthLabel && !searchCategories"
                :category="{ name: 'month' }"
                :label="monthLabel"
            />

            <template v-if="!areAllBooksEmpty">
                <BooksGrid
                    v-if="!searchCategories"
                    :category="{ name: 'forgotten' }"
                    label="Remember these books?"
                />

                <BooksGrid
                    v-for="(category, index) in workingCategories"
                    :key="index"
                    :category="category"
                />

                <BooksGrid
                    v-if="!searchCategories"
                    :category="{ name: 'popular' }"
                    label="Your favorite books!"
                />
            </template>
            <div v-else class="flex flex-col items-center py-8">
                <h2
                    class="mb-8 font-semibold text-2xl text-gray-100 leading-tight"
                >
                    {{ notFoundContent }}
                </h2>
                <ManEmptyCircle />
            </div>
        </div>
        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import FormModal from "@/Components/FormModal.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BooksGrid from "@/Pages/Books/BooksGrid.vue";
import { usePermissions } from "@/composables/permissions";
import { Head, Link, router, usePage } from "@inertiajs/vue3";
import { computed, defineAsyncComponent, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const { t } = useTranslations();
const { canEditPages } = usePermissions();
const notFoundContent = computed(() => t("search.not_found_books"));
// Only page editors open it, so keep it (and its map and pickers) out of
// the home page's bundle until then.
const NewBookForm = defineAsyncComponent(() =>
    import("@/Pages/Books/NewBookForm.vue")
);
const showNewBookForm = ref(false);
const newBookFormRef = ref(null);

let authorsRequested = false;
const openNewBookForm = () => {
    showNewBookForm.value = true;
    if (props.authors || authorsRequested) return;
    authorsRequested = true;
    router.reload({
        only: ["authors"],
        // Once it lands `props.authors` is set; if it fails, let a reopen retry.
        onFinish: () => (authorsRequested = false),
    });
};

const props = defineProps({
    categories: {
        type: Array,
        required: true,
    },
    searchCategories: {
        type: Array,
        default: null,
    },
    themeLabel: {
        type: String,
        default: "Themed Books",
    },
    monthLabel: {
        type: String,
        default: null,
    },
    // Optional prop: arrives only once the new-book form asks for it.
    authors: {
        type: Array,
        default: null,
    },
});

const workingCategories = computed(() => {
    return props.searchCategories || props.categories;
});
const currentTheme = computed(() => {
    return usePage().props.theme;
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
            speak(notFoundContent.value);
        }
    },
    { immediate: true }
);
</script>
