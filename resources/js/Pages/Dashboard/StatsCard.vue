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
                            `Total number of books: ${
                                statsData.numberOfBooks?.toLocaleString?.() ?? 0
                            }`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Total number of books</p>
            </div>
            <p class="font-bold">
                {{ statsData.numberOfBooks?.toLocaleString?.() ?? 0 }}
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
                            `Total number of pages: ${
                                statsData.numberOfPages?.toLocaleString?.() ?? 0
                            }`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Total number of pages</p>
            </div>
            <p class="font-bold">
                {{ statsData.numberOfPages?.toLocaleString?.() ?? 0 }}
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
                            `Total number of songs: ${
                                statsData.numberOfSongs?.toLocaleString?.() ?? 0
                            }`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Total number of songs</p>
            </div>
            <p class="font-bold">
                {{ statsData.numberOfSongs?.toLocaleString?.() ?? 0 }}
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
                            `Pages that are images: ${
                                statsData.numberOfImages?.toLocaleString?.() ??
                                0
                            }`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are images</p>
            </div>
            <p class="font-bold">
                {{ statsData.numberOfImages?.toLocaleString?.() ?? 0 }}
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
                            `Pages that are videos: ${
                                statsData.numberOfVideos?.toLocaleString?.() ??
                                0
                            }`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are videos</p>
            </div>
            <p class="font-bold">
                {{ statsData.numberOfVideos?.toLocaleString?.() ?? 0 }}
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
                            `Pages that are YouTube videos: ${
                                statsData.numberOfYouTubeVideos?.toLocaleString?.() ??
                                0
                            }`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are YouTube videos</p>
            </div>
            <p class="font-bold">
                {{ statsData.numberOfYouTubeVideos?.toLocaleString?.() ?? 0 }}
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
                            `Pages that are screenshots: ${
                                statsData.numberOfScreenshots?.toLocaleString?.() ??
                                0
                            }`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Pages that are screenshots</p>
            </div>
            <p class="font-bold">
                {{ statsData.numberOfScreenshots?.toLocaleString?.() ?? 0 }}
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
                                statsData.mostPages?.title || ''
                            }. ${
                                statsData.mostPages?.pages_count?.toLocaleString?.() ||
                                0
                            } pages.`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Book with most pages</p>
            </div>
            <div class="flex-1 flex items-center justify-end">
                <div class="flex items-center">
                    <Link
                        class="flex items-center mb-4 font-bold hover:text-blue-400 underline"
                        :href="route('books.show', statsData.mostPages?.slug)"
                        :aria-label="`View book ${
                            statsData.mostPages?.title || ''
                        }`"
                        :title="statsData.mostPages?.title"
                    >
                        <div class="flex-shrink-0 mr-3">
                            <img
                                v-if="
                                    statsData.mostPages?.cover_image?.media_path
                                "
                                :src="
                                    statsData.mostPages.cover_image.media_path
                                "
                                :alt="statsData.mostPages?.title"
                                class="w-10 h-10 rounded-lg object-cover"
                                @error="
                                    (e) => (e.target.style.display = 'none')
                                "
                            />
                            <div
                                v-else
                                class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                            >
                                <i
                                    class="ri-book-line text-xl text-gray-400 dark:text-gray-500"
                                ></i>
                            </div>
                        </div>

                        <span class="truncate" style="max-width: 100%">{{
                            statsData.mostPages?.title
                        }}</span>
                    </Link>
                </div>
                <p class="ml-4">
                    {{
                        countAddS(statsData.mostPages?.pages_count || 0, "page")
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
                            `Book with least pages: ${
                                statsData.leastPages?.title || ''
                            }. ${statsData.leastPages?.pages_count || 0} pages.`
                        )
                    "
                >
                    <i class="ri-speak-fill text-2xl"></i>
                </Button>

                <p>Book with least pages</p>
            </div>
            <div class="flex-1 flex items-center justify-end">
                <Link
                    class="flex items-center mb-0 font-bold hover:text-blue-400 underline"
                    :href="route('books.show', statsData.leastPages?.slug)"
                    :aria-label="`View book ${
                        statsData.leastPages?.title || ''
                    }`"
                    :title="statsData.leastPages?.title"
                >
                    <div class="flex-shrink-0 mr-3">
                        <img
                            v-if="statsData.leastPages?.cover_image?.media_path"
                            :src="statsData.leastPages.cover_image.media_path"
                            :alt="statsData.leastPages?.title"
                            class="w-10 h-10 rounded-lg object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                            v-else
                            class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                            <i
                                class="ri-book-line text-xl text-gray-400 dark:text-gray-500"
                            ></i>
                        </div>
                    </div>

                    <span class="truncate" style="max-width: 100%">{{
                        statsData.leastPages?.title
                    }}</span>
                </Link>
                <p class="ml-4">
                    {{
                        countAddS(
                            statsData.leastPages?.pages_count || 0,
                            "page"
                        )
                    }}
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
                v-for="(book, index) in statsData.mostReadBooks || []"
                :key="book.id"
                class="border-b py-2 flex items-center"
            >
                <span class="text-gray-500 dark:text-gray-400 mr-2"
                    >{{ index + 1 }}.</span
                >

                <Link
                    class="flex-1 flex items-center font-medium hover:text-blue-400"
                    :href="route('books.show', book.slug)"
                    :aria-label="`View book ${book.title}`"
                    :title="book.title"
                >
                    <div class="flex-shrink-0 mr-3">
                        <img
                            v-if="book.cover_image?.media_path"
                            :src="book.cover_image.media_path"
                            :alt="book.title"
                            class="w-10 h-10 rounded-lg object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                            v-else
                            class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                            <i
                                class="ri-book-line text-xl text-gray-400 dark:text-gray-500"
                            ></i>
                        </div>
                    </div>

                    <span class="truncate" style="max-width: 100%">{{
                        book.title
                    }}</span>
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
                v-for="(song, index) in statsData.mostReadSongs || []"
                :key="song.id"
                class="border-b py-2 flex items-center"
            >
                <span class="text-gray-500 dark:text-gray-400 mr-2"
                    >{{ index + 1 }}.</span
                >

                <Link
                    class="flex-1 flex items-center font-medium hover:text-blue-400"
                    :href="route('music.show', song.id)"
                    :aria-label="`View song ${song.title}`"
                    :title="song.title"
                >
                    <div class="flex-shrink-0 mr-3">
                        <img
                            v-if="song.thumbnail_default"
                            :src="song.thumbnail_default"
                            :alt="song.title"
                            class="w-10 h-10 rounded-lg object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                            v-else
                            class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                            <i
                                class="ri-music-2-line text-xl text-gray-400 dark:text-gray-500"
                            ></i>
                        </div>
                    </div>

                    <span class="truncate" style="max-width: 100%">{{
                        song.title
                    }}</span>
                </Link>
            </div>
        </div>
    </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import { Link } from "@inertiajs/vue3";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { ref, watch } from "vue";

const props = defineProps({
    stats: {
        type: Object,
        required: true,
    },
});

// Resolve deferred Inertia props: support functions that return a Promise or an object.
const statsData = ref({});

const resolveStats = () => {
    try {
        if (typeof props.stats === "function") {
            const result = props.stats();
            if (result && typeof result.then === "function") {
                // It's a Promise (deferred) — resolve it into the ref.
                result
                    .then((data) => {
                        statsData.value = data || {};
                    })
                    .catch(() => {
                        statsData.value = {};
                    });
            } else {
                // Synchronous result
                statsData.value = result || {};
            }
        } else {
            statsData.value = props.stats || {};
        }
    } catch (e) {
        statsData.value = props.stats || {};
    }
};

// Resolve immediately and whenever the prop changes (Inertia may pass a deferred function).
resolveStats();
watch(() => props.stats, resolveStats);

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
    const books = statsData.value?.mostReadBooks || [];
    if (!books.length) return;

    const items = books.slice(0, 5).map((b, i) => `${i + 1}. ${b.title}`);
    const phrase = `Top five books: ${items.join(". ")}.`;
    speak(phrase);
}

// Speak the top 5 songs as a single short phrase.
function speakTopSongs() {
    const songs = statsData.value?.mostReadSongs || [];
    if (!songs.length) return;

    const items = songs.slice(0, 5).map((s, i) => `${i + 1}. ${s.title}`);
    const phrase = `Top five songs: ${items.join(". ")}.`;
    speak(phrase);
}
</script>

<style scoped></style>
