<template>
    <Head title="Poops" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center">
                <Link class="w-1/4" :href="route('books.index')">
                    <h2 class="font-bold text-2xl text-gray-900 leading-tight">
                        {{ title }}
                    </h2>
                </Link>

                <SearchInput route-name="books.search" label="Poops" />
            </div>
        </template>

        <BooksGrid
            v-if="!searchCategories"
            :category="{ name: 'popular' }"
            label="Your favorite poops!"
        />

        <div v-for="(category, index) in workingCategories" :key="index">
            <BooksGrid :category="category" />
        </div>

        <BooksGrid
            v-if="!searchCategories"
            :category="{ name: 'forgotten' }"
            label="Did you forget these?"
        />
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

const title = computed(() => {
    const search = usePage().props.value.search;
    if (search) {
        return `Poops with "${search}"`;
    }
    return "Poops";
});
</script>
