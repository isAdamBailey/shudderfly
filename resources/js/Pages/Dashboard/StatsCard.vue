<template>
    <div class="text-gray-900 dark:text-white">
        <div class="border-b py-4 flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak total number of books"
                    @click="
                        speak(
                            `Total number of books: ${props.stats.numberOfBooks.toLocaleString()}`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Total number of books</p>
            </div>
            <p class="font-bold">
                {{ props.stats.numberOfBooks.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak total number of pages"
                    @click="
                        speak(
                            `Total number of pages: ${props.stats.numberOfPages.toLocaleString()}`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Total number of pages</p>
            </div>
            <p class="font-bold">
                {{ props.stats.numberOfPages.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak total number of songs"
                    @click="
                        speak(
                            `Total number of songs: ${props.stats.numberOfSongs.toLocaleString()}`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Total number of songs</p>
            </div>
            <p class="font-bold">
                {{ props.stats.numberOfSongs.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak pages that are images"
                    @click="
                        speak(
                            `Pages that are images: ${props.stats.numberOfImages.toLocaleString()}`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are images</p>
            </div>
            <p class="font-bold">
                {{ props.stats.numberOfImages.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak pages that are videos"
                    @click="
                        speak(
                            `Pages that are videos: ${props.stats.numberOfVideos.toLocaleString()}`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are videos</p>
            </div>
            <p class="font-bold">
                {{ props.stats.numberOfVideos.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak pages that are YouTube videos"
                    @click="
                        speak(
                            `Pages that are YouTube videos: ${props.stats.numberOfYouTubeVideos.toLocaleString()}`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are YouTube videos</p>
            </div>
            <p class="font-bold">
                {{ props.stats.numberOfYouTubeVideos.toLocaleString() }}
            </p>
        </div>
        <div class="border-b py-4 flex items-center justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak pages that are screenshots"
                    @click="
                        speak(
                            `Pages that are screenshots: ${props.stats.numberOfScreenshots.toLocaleString()}`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are screenshots</p>
            </div>
            <p class="font-bold">
                {{ props.stats.numberOfScreenshots.toLocaleString() }}
            </p>
        </div>
        <div class="border-b mt-4 flex justify-between">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak book with most pages"
                    @click="
                        speak(
                            `Book with most pages: ${
                                props.stats.mostPages.title
                            }. ${props.stats.mostPages.pages_count.toLocaleString()} pages.`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Book with most pages</p>
            </div>
            <div class="flex-1 flex items-center justify-end">
                <Link
                    class="mb-4 font-bold hover:text-blue-400 underline"
                    :href="route('books.show', props.stats.mostPages.slug)"
                >
                    {{ props.stats.mostPages.title }}
                </Link>
                <p class="ml-4">
                    {{
                        countAddS(
                            props.stats.mostPages.pages_count.toLocaleString(),
                            "page"
                        )
                    }}
                </p>
            </div>
        </div>
        <div class="border-b mt-4 flex justify-between items-center">
            <div class="flex items-center">
                <Button
                    class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak book with least pages"
                    @click="
                        speak(
                            `Book with least pages: ${props.stats.leastPages.title}. ${props.stats.leastPages.pages_count} pages.`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Book with least pages</p>
            </div>
            <div class="flex-1 flex items-center justify-end">
                <Link
                    class="mb-4 font-bold hover:text-blue-400 underline"
                    :href="route('books.show', props.stats.leastPages.slug)"
                >
                    {{ props.stats.leastPages.title }}
                </Link>
                <p class="ml-4">
                    {{ countAddS(props.stats.leastPages.pages_count, "page") }}
                </p>
            </div>
        </div>
        <div class="mt-6">
            <div class="flex items-center mb-2">
                <Button
                    class="mr-3 py-0.5 px-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak top 5 books"
                    @click="speakTopBooks"
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p class="font-bold text-lg">Top 5 Most Popular Books</p>
            </div>
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
            <div class="flex items-center mb-2">
                <Button
                    class="mr-3 py-0.5 px-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    type="button"
                    :disabled="speaking"
                    aria-label="Speak top 5 songs"
                    @click="speakTopSongs"
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p class="font-bold text-lg">Top 5 Most Popular Songs</p>
            </div>
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
                    :href="route('music.show', song.id)"
                >
                    {{ song.title }}
                </Link>
            </div>
        </div>
    </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { Link } from "@inertiajs/vue3";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";

const props = defineProps({
    stats: {
        type: Object,
        required: true,
    },
});

const { speak, speaking } = useSpeechSynthesis();

// Accept either a number or a string (possibly already formatted with commas).
function countAddS(count, word) {
    const countStr =
        typeof count === "number" ? String(count) : String(count || "0");
    // Remove commas so we can reliably parse the numeric value.
    const numeric = Number(countStr.replace(/,/g, ""));
    const display =
        typeof count === "number" ? numeric.toLocaleString() : countStr;
    const singular = numeric === 1;
    return `${display} ${singular ? word : `${word}s`}`;
}

// Speak the top 5 books as a single short phrase.
function speakTopBooks() {
    const books = props.stats?.mostReadBooks || [];
    if (!books.length) return;

    const items = books.slice(0, 5).map((b, i) => `${i + 1}. ${b.title}`);
    const phrase = `Top five books: ${items.join(". ")}.`;
    speak(phrase);
}

// Speak the top 5 songs as a single short phrase.
function speakTopSongs() {
    const songs = props.stats?.mostReadSongs || [];
    if (!songs.length) return;

    const items = songs.slice(0, 5).map((s, i) => `${i + 1}. ${s.title}`);
    const phrase = `Top five songs: ${items.join(". ")}.`;
    speak(phrase);
}
</script>

<style scoped></style>
