<template>
    <div class="text-gray-900 dark:text-white">
        <div class="border-b py-4 flex justify-between">
            <p>Total number of books</p>
            <p>{{ props.stats.numberOfBooks.toLocaleString() }}</p>
        </div>
        <div class="border-b py-4 flex justify-between">
            <p>Total number of pages / uploads</p>
            <p>{{ props.stats.numberOfPages.toLocaleString() }}</p>
        </div>
        <div class="border-b mt-4 flex justify-between">
            <p>Most popular book</p>
            <Link
                class="mb-4 border rounded px-3 py-2"
                :href="route('books.show', props.stats.mostRead.slug)"
            >
                {{ props.stats.mostRead.title }}
            </Link>
            <p>
                Smelled {{ countAddS(props.stats.mostRead.read_count, "time") }}
            </p>
        </div>
        <div class="border-b mt-4 flex justify-between">
            <p>Least popular book</p>
            <Link
                class="mb-4 border rounded px-3 py-2"
                :href="route('books.show', props.stats.leastRead.slug)"
            >
                {{ props.stats.leastRead.title }}
            </Link>
            <p>
                Smelled
                {{ countAddS(props.stats.leastRead.read_count, "time") }}
            </p>
        </div>
        <div class="border-b mt-4 flex justify-between">
            <p>Book with most pages</p>
            <Link
                class="mb-4 border rounded px-3 py-2"
                :href="route('books.show', props.stats.mostPages.slug)"
            >
                {{ props.stats.mostPages.title }}
            </Link>
            <p>
                {{
                    countAddS(
                        props.stats.mostPages.pages_count.toLocaleString(),
                        "page"
                    )
                }}
            </p>
        </div>
        <div class="border-b mt-4 flex justify-between">
            <p>Book with least pages</p>
            <Link
                class="mb-4 border rounded px-3 py-2"
                :href="route('books.show', props.stats.leastPages.slug)"
            >
                {{ props.stats.leastPages.title }}
            </Link>
            <p>{{ countAddS(props.stats.leastPages.pages_count, "page") }}</p>
        </div>
    </div>
</template>

<script setup>
import { Link } from "@inertiajs/vue3";

const props = defineProps({
    stats: {
        type: Object,
        required: true,
    },
});

function countAddS(count, word) {
    return `${count} ${count == 1 ? word : `${word}s`}`;
}
</script>
