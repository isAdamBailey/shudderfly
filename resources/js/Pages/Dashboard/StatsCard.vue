<template>
    <div class="text-gray-900 dark:text-white">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
            <h3 class="font-heading text-lg font-bold">Site statistics</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
                Quick access to common filters and top items
            </p>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- Books -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to books index -->
                <Link
                    class="flex items-center"
                    :href="route('books.index')"
                    aria-label="View all books"
                >
                    <i class="ri-book-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Books</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfBooks?.toLocaleString?.() ?? 0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <Button
                        type="button"
                        :disabled="speaking"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 mr-2 p-1.5 h-8 w-8 speak-btn"
                        aria-label="Speak books"
                        @click="
                            speak(
                                `all books: ${
                                    statsData.numberOfBooks?.toLocaleString?.() ??
                                    0
                                }`
                            )
                        "
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>

            <!-- Pages -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <Link
                    class="flex items-center"
                    :href="route('pictures.index')"
                    aria-label="View uploads"
                >
                    <i
                        class="ri-file-text-line text-2xl text-gray-400 mr-3"
                    ></i>
                    <div>
                        <div class="text-base text-gray-500">Pages</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfPages?.toLocaleString?.() ?? 0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <Button
                        type="button"
                        :disabled="speaking"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 mr-2 p-1.5 h-8 w-8 speak-btn"
                        aria-label="Speak total number of pages"
                        @click="
                            speak(
                                `all pages: ${
                                    statsData.numberOfPages?.toLocaleString?.() ??
                                    0
                                }`
                            )
                        "
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>

            <!-- Songs -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <Link
                    class="flex items-center"
                    :href="route('pictures.index', { filter: 'music' })"
                    aria-label="View music uploads"
                >
                    <i class="ri-music-2-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Songs</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfSongs?.toLocaleString?.() ?? 0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <Button
                        type="button"
                        :disabled="speaking"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 mr-2 p-1.5 h-8 w-8 speak-btn"
                        aria-label="Speak songs"
                        @click="
                            speak(
                                `songs: ${
                                    statsData.numberOfSongs?.toLocaleString?.() ??
                                    0
                                }`
                            )
                        "
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>

            <!-- Images (pages that are images) -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <Link
                    class="flex items-center"
                    :href="route('pictures.index')"
                    aria-label="View image pages"
                >
                    <i class="ri-image-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Images</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfImages?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <Button
                        type="button"
                        :disabled="speaking"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 mr-2 p-1.5 h-8 w-8 speak-btn"
                        aria-label="Speak images"
                        @click="
                            speak(
                                `images: ${
                                    statsData.numberOfImages?.toLocaleString?.() ??
                                    0
                                }`
                            )
                        "
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>

            <!-- Videos -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to popular uploads (pictures.index?filter=popular) -->
                <Link
                    class="flex items-center"
                    :href="route('pictures.index')"
                    aria-label="View videos"
                >
                    <i class="ri-video-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Videos</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfVideos?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <Button
                        type="button"
                        :disabled="speaking"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 mr-2 p-1.5 h-8 w-8 speak-btn"
                        aria-label="Speak videos"
                        @click="
                            speak(
                                `videos: ${
                                    statsData.numberOfVideos?.toLocaleString?.() ??
                                    0
                                }`
                            )
                        "
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>

            <!-- YouTube videos -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to youtube filter -->
                <Link
                    class="flex items-center"
                    :href="route('pictures.index', { filter: 'youtube' })"
                    aria-label="View YouTube videos"
                >
                    <i class="ri-youtube-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">
                            YouTube videos
                        </div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfYouTubeVideos?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <Button
                        type="button"
                        :disabled="speaking"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 mr-2 p-1.5 h-8 w-8 speak-btn"
                        aria-label="Speak YouTube videos"
                        @click="
                            speak(
                                `YouTube videos: ${
                                    statsData.numberOfYouTubeVideos?.toLocaleString?.() ??
                                    0
                                }`
                            )
                        "
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>

            <!-- Screenshots -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to snapshots -->
                <Link
                    class="flex items-center"
                    :href="route('pictures.index', { filter: 'snapshot' })"
                    aria-label="View screenshots"
                >
                    <i class="ri-camera-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Screenshots</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfScreenshots?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <Button
                        type="button"
                        :disabled="speaking"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 mr-2 p-1.5 h-8 w-8 speak-btn"
                        aria-label="Speak screenshots"
                        @click="
                            speak(
                                `screenshots: ${
                                    statsData.numberOfScreenshots?.toLocaleString?.() ??
                                    0
                                }`
                            )
                        "
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>
        </div>

        <!-- Most / Least pages -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <img
                            v-if="statsData.mostPages?.cover_image?.media_path"
                            :src="statsData.mostPages.cover_image.media_path"
                            :alt="statsData.mostPages?.title"
                            class="w-16 h-16 rounded-lg object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                            v-else
                            class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                            <i
                                class="ri-book-line text-xl text-gray-400 dark:text-gray-500"
                            ></i>
                        </div>
                    </div>

                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-sm text-gray-500">
                                    Book with most pages
                                </div>
                                <Link
                                    class="font-bold hover:text-blue-400 truncate block"
                                    :href="
                                        route(
                                            'books.show',
                                            statsData.mostPages?.slug
                                        )
                                    "
                                    :title="statsData.mostPages?.title"
                                >
                                    {{ statsData.mostPages?.title }}
                                </Link>
                                <div class="text-sm text-gray-500 mt-1">
                                    {{
                                        countAddS(
                                            statsData.mostPages?.pages_count ||
                                                0,
                                            "page"
                                        )
                                    }}
                                </div>
                            </div>

                            <div class="ml-4">
                                <Button
                                    type="button"
                                    :disabled="speaking"
                                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1.5 h-8 w-8 speak-btn"
                                    aria-label="Speak book with most pages"
                                    @click="
                                        speak(
                                            `Book with most pages: ${
                                                statsData.mostPages?.title || ''
                                            }. ${
                                                statsData.mostPages
                                                    ?.pages_count || 0
                                            } pages.`
                                        )
                                    "
                                >
                                    <i class="ri-speak-fill text-lg"></i>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <img
                            v-if="statsData.leastPages?.cover_image?.media_path"
                            :src="statsData.leastPages.cover_image.media_path"
                            :alt="statsData.leastPages?.title"
                            class="w-16 h-16 rounded-lg object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                            v-else
                            class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                            <i
                                class="ri-book-line text-xl text-gray-400 dark:text-gray-500"
                            ></i>
                        </div>
                    </div>

                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-sm text-gray-500">
                                    Book with least pages
                                </div>
                                <Link
                                    class="font-bold hover:text-blue-400 truncate block"
                                    :href="
                                        route(
                                            'books.show',
                                            statsData.leastPages?.slug
                                        )
                                    "
                                    :title="statsData.leastPages?.title"
                                >
                                    {{ statsData.leastPages?.title }}
                                </Link>
                                <div class="text-sm text-gray-500 mt-1">
                                    {{
                                        countAddS(
                                            statsData.leastPages?.pages_count ||
                                                0,
                                            "page"
                                        )
                                    }}
                                </div>
                            </div>

                            <div class="ml-4">
                                <Button
                                    type="button"
                                    :disabled="speaking"
                                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1.5 h-8 w-8 speak-btn"
                                    aria-label="Speak book with least pages"
                                    @click="
                                        speak(
                                            `Book with least pages: ${
                                                statsData.leastPages?.title ||
                                                ''
                                            }. ${
                                                statsData.leastPages
                                                    ?.pages_count || 0
                                            } pages.`
                                        )
                                    "
                                >
                                    <i class="ri-speak-fill text-lg"></i>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Top lists -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <Button
                            class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1.5 h-8 w-8 speak-btn"
                            type="button"
                            :disabled="speaking"
                            aria-label="Speak top 5 books"
                            @click="speakTopBooks"
                        >
                            <i class="ri-speak-fill text-lg"></i>
                        </Button>
                        <p class="font-bold text-lg">
                            Top 5 Most Popular Books
                        </p>
                    </div>

                    <Link
                        class="text-sm font-medium text-blue-500 hover:underline"
                        :href="route('books.index')"
                        >View all</Link
                    >
                </div>

                <div class="space-y-2">
                    <div
                        v-for="(book, index) in statsData.mostReadBooks || []"
                        :key="book.id"
                        class="flex items-center justify-between"
                    >
                        <div class="flex items-center">
                            <span class="text-gray-500 dark:text-gray-400 mr-2"
                                >{{ index + 1 }}.</span
                            >
                            <Link
                                class="flex items-center font-medium hover:text-blue-400 truncate"
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
                                        @error="
                                            (e) =>
                                                (e.target.style.display =
                                                    'none')
                                        "
                                    />
                                </div>

                                <span
                                    class="truncate"
                                    style="max-width: 100%"
                                    >{{ book.title }}</span
                                >
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <Button
                            class="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1.5 h-8 w-8 speak-btn"
                            type="button"
                            :disabled="speaking"
                            aria-label="Speak top 5 songs"
                            @click="speakTopSongs"
                        >
                            <i class="ri-speak-fill text-lg"></i>
                        </Button>
                        <p class="font-bold text-lg">
                            Top 5 Most Popular Songs
                        </p>
                    </div>

                    <Link
                        class="text-sm font-medium text-blue-500 hover:underline"
                        :href="route('music.index')"
                        >View all</Link
                    >
                </div>

                <div class="space-y-2">
                    <div
                        v-for="(song, index) in statsData.mostReadSongs || []"
                        :key="song.id"
                        class="flex items-center justify-between"
                    >
                        <div class="flex items-center">
                            <span class="text-gray-500 dark:text-gray-400 mr-2"
                                >{{ index + 1 }}.</span
                            >
                            <Link
                                class="flex items-center font-medium hover:text-blue-400 truncate"
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
                                        @error="
                                            (e) =>
                                                (e.target.style.display =
                                                    'none')
                                        "
                                    />
                                </div>

                                <span
                                    class="truncate"
                                    style="max-width: 100%"
                                    >{{ song.title }}</span
                                >
                            </Link>
                        </div>
                    </div>
                </div>
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

<style scoped>
.speak-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
</style>
