<script setup>
import Avatar from "@/Components/Avatar.vue";
import Button from "@/Components/Button.vue";
import MessageTimeline from "@/Components/Messages/MessageTimeline.vue";
import StatCard from "@/Components/StatCard.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { Head } from "@inertiajs/vue3";
import { computed, defineOptions } from "vue";

defineOptions({
    name: "UserShow",
});

const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
    profileUser: {
        type: Object,
        required: true,
    },
    stats: {
        type: Object,
        required: true,
    },
    recentMessages: {
        type: Array,
        default: () => [],
    },
});

const memberSince = computed(() => {
    const date = new Date(props.profileUser.created_at);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
});

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const speakTopBooks = () => {
    const bookTexts = props.stats.topBooks.map((book, index) => {
        const reads = book.read_count === 1 ? "read" : "reads";
        return `${index + 1}. ${book.title}: ${book.read_count} ${reads}`;
    });
    const fullText = "Top books by read count. " + bookTexts.join(". ") + ".";
    speak(fullText);
};

const speakRecentBooks = () => {
    const bookTexts = props.stats.recentBooks.map((book, index) => {
        const reads = book.read_count === 1 ? "read" : "reads";
        return `${index + 1}. ${book.title}: ${book.read_count} ${reads}`;
    });
    const fullText = "Recent books created. " + bookTexts.join(". ") + ".";
    speak(fullText);
};

const speakUserSummary = () => {
    const books = props.stats.totalBooksCount === 1 ? "book" : "books";
    const messages = props.stats.messagesCount === 1 ? "message" : "messages";
    const summary = `${props.profileUser.name}. Member since ${memberSince.value}. ${props.stats.totalBooksCount} ${books} created. ${props.stats.messagesCount} ${messages} posted.`;
    speak(summary);
};
</script>

<template>
    <Head :title="`${profileUser.name} - Profile`" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <h2 class="font-heading text-2xl text-theme-title leading-tight">
                User Profile
            </h2>
        </template>

        <div class="pb-12">
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <!-- Profile Header -->
                <div
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg mb-6"
                >
                    <div class="p-6">
                        <div class="flex items-start gap-6">
                            <Avatar :user="profileUser" size="xl" />
                            <div class="flex-1">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <h1
                                            class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2"
                                        >
                                            {{ profileUser.name }}
                                        </h1>
                                        <p
                                            class="text-gray-600 dark:text-gray-400 mb-4"
                                        >
                                            {{ profileUser.email }}
                                        </p>
                                        <div
                                            class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            <i class="ri-calendar-line"></i>
                                            <span
                                                >Member since
                                                {{ memberSince }}</span
                                            >
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        :disabled="speaking"
                                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1.5 h-8 w-8"
                                        aria-label="Speak user summary"
                                        @click="speakUserSummary"
                                    >
                                        <i class="ri-speak-fill text-lg"></i>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Book Stats -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <!-- Top Books by Read Count -->
                    <div
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-4">
                                    <div
                                        class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center"
                                    >
                                        <i
                                            class="ri-fire-line text-2xl text-blue-600 dark:text-blue-400"
                                        ></i>
                                    </div>
                                    <div>
                                        <p
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            Top Books by Read Count
                                        </p>
                                        <p
                                            class="text-lg font-bold text-gray-900 dark:text-gray-100"
                                        >
                                            Most Popular
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    v-if="stats.topBooks.length > 0"
                                    type="button"
                                    :disabled="speaking"
                                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1.5 h-8 w-8"
                                    aria-label="Speak top books"
                                    @click="speakTopBooks"
                                >
                                    <i class="ri-speak-fill text-lg"></i>
                                </Button>
                            </div>

                            <div
                                v-if="stats.topBooks.length > 0"
                                class="space-y-3"
                            >
                                <StatCard
                                    v-for="book in stats.topBooks"
                                    :key="book.id"
                                    icon="ri-book-line"
                                    icon-color="text-blue-600 dark:text-blue-400"
                                    :label="book.title"
                                    :value="Math.floor(book.read_count).toLocaleString()"
                                    :subtitle="
                                        book.read_count !== 1 ? 'reads' : 'read'
                                    "
                                    :href="route('books.show', book.slug)"
                                    :cover-image="book.cover_image?.media_path"
                                />
                            </div>
                            <div
                                v-else
                                class="text-center py-4 text-gray-500 dark:text-gray-400"
                            >
                                No books created yet
                            </div>
                        </div>
                    </div>

                    <!-- Recent Books Created -->
                    <div
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-4">
                                    <div
                                        class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center"
                                    >
                                        <i
                                            class="ri-book-line text-2xl text-purple-600 dark:text-purple-400"
                                        ></i>
                                    </div>
                                    <div>
                                        <p
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            Recent Books Created
                                        </p>
                                        <p
                                            class="text-lg font-bold text-gray-900 dark:text-gray-100"
                                        >
                                            {{ stats.totalBooksCount }} total
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    v-if="stats.recentBooks.length > 0"
                                    type="button"
                                    :disabled="speaking"
                                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 p-1.5 h-8 w-8"
                                    aria-label="Speak recent books"
                                    @click="speakRecentBooks"
                                >
                                    <i class="ri-speak-fill text-lg"></i>
                                </Button>
                            </div>

                            <div
                                v-if="stats.recentBooks.length > 0"
                                class="space-y-3"
                            >
                                <StatCard
                                    v-for="book in stats.recentBooks"
                                    :key="book.id"
                                    icon="ri-book-line"
                                    icon-color="text-purple-600 dark:text-purple-400"
                                    :label="book.title"
                                    :value="Math.floor(book.read_count).toLocaleString()"
                                    :subtitle="`${
                                        book.read_count !== 1 ? 'reads' : 'read'
                                    } • ${formatDate(book.created_at)}`"
                                    :href="route('books.show', book.slug)"
                                    :cover-image="book.cover_image?.media_path"
                                />
                            </div>
                            <div
                                v-else
                                class="text-center py-4 text-gray-500 dark:text-gray-400"
                            >
                                No books created yet
                            </div>
                        </div>
                    </div>

                    <!-- Book Stats Summary -->
                    <div class="space-y-3">
                        <StatCard
                            icon="ri-book-line"
                            icon-color="text-blue-600 dark:text-blue-400"
                            label="Total Books"
                            :value="stats.totalBooksCount"
                        />
                        <StatCard
                            icon="ri-eye-line"
                            icon-color="text-green-600 dark:text-green-400"
                            label="Total Reads"
                            :value="Math.floor(stats.totalReads).toLocaleString()"
                        />
                    </div>
                </div>

                <!-- Recent Messages -->
                <div
                    v-if="recentMessages.length > 0"
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                >
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-xl font-bold text-gray-900 dark:text-gray-100"
                            >
                                Recent Messages
                            </h3>
                            <div
                                class="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900"
                            >
                                <i
                                    class="ri-message-3-line text-green-600 dark:text-green-400"
                                ></i>
                                <span
                                    class="font-semibold text-green-700 dark:text-green-300"
                                >
                                    {{ stats.messagesCount }} total
                                </span>
                            </div>
                        </div>
                        <MessageTimeline :messages="recentMessages" read-only />
                    </div>
                </div>
                <div
                    v-else
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                >
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-xl font-bold text-gray-900 dark:text-gray-100"
                            >
                                Messages
                            </h3>
                            <div
                                class="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700"
                            >
                                <i
                                    class="ri-message-3-line text-gray-600 dark:text-gray-400"
                                ></i>
                                <span
                                    class="font-semibold text-gray-700 dark:text-gray-300"
                                >
                                    {{ stats.messagesCount }} total
                                </span>
                            </div>
                        </div>
                        <div
                            class="text-center py-4 text-gray-500 dark:text-gray-400"
                        >
                            No messages yet.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>
