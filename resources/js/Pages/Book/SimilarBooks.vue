<template>
    <div v-if="workingBooks.length > 0" class="md:pl-3 mt-10">
        <h3
            class="pt-2 text-2xl text-yellow-200 dark:text-gray-100 font-heading"
        >
            {{ label }}
        </h3>
        <div
            class="flex snap-x space-x-1 overflow-y-hidden pb-2 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded"
        >
            <BookCoverCard
                v-for="book in workingBooks"
                :key="book.id"
                :book="book"
                container-class="w-48 h-64 shrink-0 snap-start"
                title-size="text-base sm:text-lg"
                @click="setBookLoading"
            />
        </div>
    </div>
</template>

<script setup>
import BookCoverCard from "@/Components/BookCoverCard.vue";
import { computed, reactive } from "vue";

const props = defineProps({
    books: {
        type: Array,
        required: true,
    },
    label: {
        type: String,
        default: null,
    },
});

const workingBooks = computed(() => {
    return (
        props.books?.map((book) => reactive({ ...book, loading: false })) || []
    );
});

function setBookLoading(book) {
    book.loading = true;
}
</script>
