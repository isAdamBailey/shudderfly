<script setup>
import Avatar from "@/Components/Avatar.vue";
import MessageTimeline from "@/Components/Messages/MessageTimeline.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head, Link } from "@inertiajs/vue3";
import { computed, defineOptions } from "vue";

defineOptions({
    name: "UserShow",
});

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

const totalReads = computed(() => {
    return props.stats.topBooks.reduce((sum, book) => sum + book.read_count, 0);
});

const averageReads = computed(() => {
    if (props.stats.topBooks.length === 0) return 0;
    return Math.round(totalReads.value / props.stats.topBooks.length);
});
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
                                    <span>Member since {{ memberSince }}</span>
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
                            <div class="flex items-center gap-4 mb-4">
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

                            <div
                                v-if="stats.topBooks.length > 0"
                                class="space-y-3"
                            >
                                <Link
                                    v-for="(book, index) in stats.topBooks"
                                    :key="book.id"
                                    :href="route('books.show', book.slug)"
                                    class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                                >
                                    <span
                                        class="text-gray-500 dark:text-gray-400 font-semibold min-w-[24px]"
                                    >
                                        {{ index + 1 }}.
                                    </span>
                                    <div
                                        v-if="book.cover_image?.media_path"
                                        class="flex-shrink-0"
                                    >
                                        <img
                                            :src="book.cover_image.media_path"
                                            :alt="book.title"
                                            class="w-12 h-12 rounded object-cover"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p
                                            class="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                        >
                                            {{ book.title }}
                                        </p>
                                        <p
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            {{
                                                book.read_count.toLocaleString()
                                            }}
                                            read{{
                                                book.read_count !== 1 ? "s" : ""
                                            }}
                                        </p>
                                    </div>
                                    <i
                                        class="ri-arrow-right-s-line text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                    ></i>
                                </Link>
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
                            <div class="flex items-center gap-4 mb-4">
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

                            <div
                                v-if="stats.recentBooks.length > 0"
                                class="space-y-3"
                            >
                                <Link
                                    v-for="(book, index) in stats.recentBooks"
                                    :key="book.id"
                                    :href="route('books.show', book.slug)"
                                    class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                                >
                                    <span
                                        class="text-gray-500 dark:text-gray-400 font-semibold min-w-[24px]"
                                    >
                                        {{ index + 1 }}.
                                    </span>
                                    <div
                                        v-if="book.cover_image?.media_path"
                                        class="flex-shrink-0"
                                    >
                                        <img
                                            :src="book.cover_image.media_path"
                                            :alt="book.title"
                                            class="w-12 h-12 rounded object-cover"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p
                                            class="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                        >
                                            {{ book.title }}
                                        </p>
                                        <p
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            {{ formatDate(book.created_at) }}
                                        </p>
                                    </div>
                                    <i
                                        class="ri-arrow-right-s-line text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                    ></i>
                                </Link>
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
                    <div
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center gap-4 mb-4">
                                <div
                                    class="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center"
                                >
                                    <i
                                        class="ri-book-2-line text-2xl text-orange-600 dark:text-orange-400"
                                    ></i>
                                </div>
                                <div>
                                    <p
                                        class="text-sm text-gray-500 dark:text-gray-400"
                                    >
                                        Book Statistics
                                    </p>
                                    <p
                                        class="text-lg font-bold text-gray-900 dark:text-gray-100"
                                    >
                                        Overview
                                    </p>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <div
                                    class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                                >
                                    <div class="flex items-center gap-3">
                                        <i
                                            class="ri-book-line text-blue-600 dark:text-blue-400"
                                        ></i>
                                        <span
                                            class="text-sm text-gray-700 dark:text-gray-300"
                                            >Total Books</span
                                        >
                                    </div>
                                    <span
                                        class="font-bold text-gray-900 dark:text-gray-100"
                                    >
                                        {{ stats.totalBooksCount }}
                                    </span>
                                </div>
                                <div
                                    class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                                >
                                    <div class="flex items-center gap-3">
                                        <i
                                            class="ri-eye-line text-green-600 dark:text-green-400"
                                        ></i>
                                        <span
                                            class="text-sm text-gray-700 dark:text-gray-300"
                                            >Total Reads</span
                                        >
                                    </div>
                                    <span
                                        class="font-bold text-gray-900 dark:text-gray-100"
                                    >
                                        {{ totalReads.toLocaleString() }}
                                    </span>
                                </div>
                                <div
                                    v-if="stats.topBooks.length > 0"
                                    class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                                >
                                    <div class="flex items-center gap-3">
                                        <i
                                            class="ri-bar-chart-line text-purple-600 dark:text-purple-400"
                                        ></i>
                                        <span
                                            class="text-sm text-gray-700 dark:text-gray-300"
                                            >Avg. Reads</span
                                        >
                                    </div>
                                    <span
                                        class="font-bold text-gray-900 dark:text-gray-100"
                                    >
                                        {{ averageReads.toLocaleString() }}
                                    </span>
                                </div>
                            </div>
                        </div>
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
