<template>
    <Head :title="categoryTitle" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center mb-10">
                <Link class="w-1/2" :href="route('books.index')">
                    <div class="flex items-center gap-3">
                        <ApplicationLogo
                            v-if="props.categoryName === 'themed'"
                            class="w-12 h-12 flex-shrink-0"
                        />
                        <h2
                            class="font-heading text-3xl text-theme-title leading-tight"
                        >
                            {{ categoryTitle }}
                        </h2>
                    </div>
                </Link>
            </div>
        </template>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div v-if="locations && locations.length > 0" class="w-full mb-6">
                <CategoryMap :locations="locations" />
            </div>

            <div
                v-if="!props.isSpecialCategory"
                class="flex flex-wrap items-center gap-3 mb-6"
            >
                <div
                    role="group"
                    :aria-label="t('category.sort_group')"
                    class="flex flex-wrap gap-2"
                >
                    <Button
                        type="button"
                        :is-active="isOldest"
                        :disabled="sortLoading"
                        class="rounded-full !px-3 !py-3 min-h-11 min-w-11 justify-center"
                        :aria-label="`${t('category.sort_group')}: ${t(
                            'category.sort_oldest',
                            { category: categoryTitle }
                        )}`"
                        @click="sortBooks('oldest')"
                    >
                        <i
                            class="ri-history-line text-2xl"
                            aria-hidden="true"
                        ></i>
                    </Button>
                    <Button
                        type="button"
                        :is-active="isPopular"
                        :disabled="sortLoading"
                        class="rounded-full !px-3 !py-3 min-h-11 min-w-11 justify-center"
                        :aria-label="`${t('category.sort_group')}: ${t(
                            'category.sort_favorites',
                            { category: categoryTitle }
                        )}`"
                        @click="sortBooks('popular')"
                    >
                        <i class="ri-star-line text-2xl" aria-hidden="true"></i>
                    </Button>
                </div>
            </div>

            <div v-if="items.length > 0" class="mb-10">
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    <BookCoverCard
                        v-for="book in items"
                        :key="book.id"
                        :book="book"
                        @click="setItemLoading"
                    />
                </div>
            </div>

            <div v-else class="flex flex-col items-center mt-10">
                <h2
                    class="mb-8 font-semibold text-2xl text-gray-100 leading-tight"
                >
                    No books found in this category
                </h2>
                <ManEmptyCircle />
            </div>
        </div>

        <div ref="infiniteScrollRef"></div>
        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import BookCoverCard from "@/Components/BookCoverCard.vue";
import Button from "@/Components/Button.vue";
import CategoryMap from "@/Components/Map/CategoryMap.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { Head, Link, router } from "@inertiajs/vue3";
import { computed, ref } from "vue";

/* global route */

const { speak } = useSpeechSynthesis();
const { t } = useTranslations();

const props = defineProps({
    categoryName: {
        type: String,
        required: true,
    },
    books: {
        type: Object,
        required: true,
    },
    locations: {
        type: Array,
        default: () => [],
    },
    sort: {
        type: String,
        default: "newest",
    },
    isSpecialCategory: {
        type: Boolean,
        default: false,
    },
    categoryLabel: {
        type: String,
        default: null,
    },
});

const { items, infiniteScrollRef, setItemLoading } = useInfiniteScroll(
    props.books.data,
    computed(() => props.books)
);

const sortLoading = ref(false);

const isOldest = computed(() => props.sort === "oldest");
const isPopular = computed(() => props.sort === "popular");

function sortBooks(sortValue) {
    sortLoading.value = true;
    const sortKeys = {
        oldest: "category.sort_oldest",
        popular: "category.sort_favorites",
    };
    speak(t(sortKeys[sortValue], { category: categoryTitle.value }));
    router.get(
        route("categories.show", {
            categoryName: props.categoryName,
            sort: sortValue,
        }),
        {},
        {
            preserveScroll: false,
            onFinish: () => {
                sortLoading.value = false;
            },
        }
    );
}

const categoryTitle = computed(() => {
    // Special categories (themed, month) are labelled server-side
    if (props.categoryLabel) {
        return props.categoryLabel;
    }

    // Default: capitalize the category name
    return (
        props.categoryName.charAt(0).toUpperCase() + props.categoryName.slice(1)
    );
});
</script>
