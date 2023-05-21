<template>
    <Head title="Books" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between">
                <Link class="w-3/4" :href="route('books.index')">
                    <h2
                        class="font-semibold text-2xl text-gray-900 dark:text-gray-100 leading-tight"
                    >
                        Books
                    </h2>
                </Link>

                <SearchInput class="mr-4" route-name="books.search" />
            </div>
        </template>

        <BooksGrid v-if="!searchCategories" :category="{ name: 'popular' }" />

        <div v-for="(category, index) in workingCategories" :key="index">
            <BooksGrid :category="category" />
        </div>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BooksGrid from "@/Pages/Books/BooksGrid.vue";
import { Head, Link, usePage } from "@inertiajs/inertia-vue3";
import SearchInput from "@/Components/SearchInput.vue";
import { ref, computed } from "vue";

const categories = ref(usePage().props.value.categories);
const props = defineProps({
    searchCategories: {
        type: Array,
        default: null,
    },
});
const workingCategories = computed(() => {
    return props.searchCategories || categories.value;
});
</script>
