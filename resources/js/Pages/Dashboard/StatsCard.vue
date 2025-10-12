<template>
    <div class="text-gray-900 dark:text-white">
        <div class="border-b py-4 flex justify-between">
            <p>Total number of books</p>
            <p class="font-bold">
                {{ props.stats.numberOfBooks.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex justify-between">
            <p>Total number of pages</p>
            <p class="font-bold">
                {{ props.stats.numberOfPages.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex justify-between">
            <p>Total number of songs</p>
            <p class="font-bold">
                {{ props.stats.numberOfSongs.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex justify-between">
            <p>Pages that are images</p>
            <p class="font-bold">
                {{ props.stats.numberOfImages.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex justify-between">
            <p>Pages that are videos</p>
            <p class="font-bold">
                {{ props.stats.numberOfVideos.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex justify-between">
            <p>Pages that are YouTube videos</p>
            <p class="font-bold">
                {{ props.stats.numberOfYouTubeVideos.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex justify-between">
            <p>Pages that are screenshots</p>
            <p class="font-bold">
                {{ props.stats.numberOfScreenshots.toLocaleString() }}
            </p>
        </div>
        <div class="border-b mt-4 flex justify-between">
            <p>Book with most pages</p>
            <Link
                class="mb-4 font-bold hover:text-blue-400 underline"
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
                class="mb-4 font-bold hover:text-blue-400 underline"
                :href="route('books.show', props.stats.leastPages.slug)"
            >
                {{ props.stats.leastPages.title }}
            </Link>
            <p>{{ countAddS(props.stats.leastPages.pages_count, "page") }}</p>
        </div>
        <div class="mt-6">
            <p class="font-bold text-lg mb-2">Top 5 Most Popular Books</p>
            <div
                v-for="(book, index) in props.stats.mostReadBooks"
                :key="book.id"
                class="border-b py-2 flex items-center"
            >
                <span class="text-gray-500 dark:text-gray-400 mr-2"
                    >{{ index + 1 }}.</span
                >
                <Link
                    class="flex-1 font-medium hover:text-blue-400 underline"
                    :href="route('books.show', book.slug)"
                >
                    {{ book.title }}
                </Link>
            </div>
        </div>
        <div class="mt-6">
            <p class="font-bold text-lg mb-2">Top 5 Most Popular Songs</p>
            <div
                v-for="(song, index) in props.stats.mostReadSongs"
                :key="song.id"
                class="border-b py-2 flex items-center"
            >
                <span class="text-gray-500 dark:text-gray-400 mr-2"
                    >{{ index + 1 }}.</span
                >
                <Link
                    class="flex-1 font-medium hover:text-blue-400 underline"
                    :href="`/music?song=${song.id}`"
                >
                    {{ song.title }}
                </Link>
            </div>
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
    return `${count.toLocaleString()} ${count == 1 ? word : `${word}s`}`;
}
</script>
