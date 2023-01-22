<template>
    <Head title="Books" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex justify-between">
                <Link class="w-3/4" :href="route('books.index')">
                    <h2
                        class="font-semibold text-3xl text-gray-900 dark:text-gray-100 leading-tight"
                    >
                        Books
                    </h2>
                </Link>

                <SearchInput class="mr-4" route-name="books.index" />
            </div>
        </template>

        <div v-for="(category, index) in categories.data" :key="index">
            <BooksGrid :category="category" />
        </div>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BooksGrid from "@/Pages/Books/BooksGrid.vue";
import { Head, Link } from "@inertiajs/inertia-vue3";
import SearchInput from "@/Components/SearchInput.vue";

defineProps({
    categories: { type: Object, required: true },
});

</script>
