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

                <Link
                    :href="
                        randomButtonDisabled
                            ? route('books.index', { filter: 'random' })
                            : null
                    "
                >
                    <Button
                        class="w-25"
                        :disabled="randomButtonDisabled"
                        @click="randomButtonDisabled = true"
                    >
                        <span class="text-lg mr-3">Mix</span>
                        <RoundArrowsIcon />
                    </Button>
                </Link>
            </div>
        </template>

        <BooksGrid :books="books" />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import { ref } from "vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BooksGrid from "@/Pages/Books/BooksGrid.vue";
import Button from "@/Components/Button.vue";
import { Head, Link } from "@inertiajs/inertia-vue3";
import RoundArrowsIcon from "@/Components/svg/RoundArrowsIcon.vue";
import SearchInput from "@/Components/SearchInput.vue";

defineProps({
    books: { type: Object, required: true },
});

const randomButtonDisabled = ref(false);
</script>
