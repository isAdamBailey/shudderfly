<template>
    <Head title="Books" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center mb-10">
                <Link class="w-1/4" :href="route('books.index')">
                    <h2 class="font-bold text-2xl text-gray-100 leading-tight">
                        {{ title }}
                    </h2>
                </Link>

                <SearchInput route-name="books.search" label="Books" />
            </div>
        </template>
        <div class="mb-10">
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
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BooksGrid from "@/Pages/Books/BooksGrid.vue";
import { Head, Link, usePage } from "@inertiajs/vue3";
import SearchInput from "@/Components/SearchInput.vue";
import { ref, computed } from "vue";

const categories = ref(usePage().props.categories);
const props = defineProps({
    searchCategories: {
        type: Array,
        default: null,
    },
});
const workingCategories = computed(() => {
    return props.searchCategories || categories.value;
});

const title = computed(() => {
    const search = usePage().props.search;
    if (search) {
        return `Books with "${search}"`;
    }
    return "Books";
});
</script>
