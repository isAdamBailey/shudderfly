<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import MessageTimeline from "@/Components/Messages/MessageTimeline.vue";
import StatCard from "@/Components/StatCard.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { Head, Link } from "@inertiajs/vue3";
import { computed } from "vue";

defineOptions({
    name: "UserShow",
});

const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
    profileUser: {
        type: Object,
        required: true,
    },
    weeklyOverview: {
        type: Object,
        default: () => ({
            text: null,
            generatedAt: null,
        }),
    },
    stats: {
        type: Object,
        required: true,
    },
    recentMessages: {
        type: Array,
        default: () => [],
    },
    recentReplies: {
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

const weeklyOverviewGeneratedAt = computed(() => {
    if (!props.weeklyOverview?.generatedAt) {
        return null;
    }

    return formatDate(props.weeklyOverview.generatedAt);
});

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const replyMessageLink = (reply) => {
    if (!reply?.message_id) {
        return route("messages.index");
    }

    return `${route("messages.index")}#message-${reply.message_id}`;
};

const replyPreview = (text) => {
    if (!text) {
        return "";
    }

    const normalizedText = text.replace(/\s+/g, " ").trim();
    const maxLength = 140;

    if (normalizedText.length <= maxLength) {
        return normalizedText;
    }

    return `${normalizedText.slice(0, maxLength)}...`;
};

const speakTopBooks = () => {
    const bookTexts = props.stats.topBooks.map((book, index) => {
        return `${index + 1}. ${book.title}`;
    });
    const fullText = "Top books by popularity. " + bookTexts.join(". ") + ".";
    speak(fullText);
};

const speakRecentBooks = () => {
    const bookTexts = props.stats.recentBooks.map((book, index) => {
        return `${index + 1}. ${book.title}`;
    });
    const fullText = "Recent books created. " + bookTexts.join(". ") + ".";
    speak(fullText);
};

const speakUserSummary = () => {
    if (props.weeklyOverview?.text) {
        speak(`${props.profileUser.name}. ${props.weeklyOverview.text}`);
        return;
    }

    const books = props.stats.totalBooksCount === 1 ? "book" : "books";
    const messages = props.stats.messagesCount === 1 ? "message" : "messages";
    const comments = props.stats.commentsCount === 1 ? "comment" : "comments";
    const reactions =
        props.stats.reactionsGiven === 1 ? "reaction" : "reactions";

    const summary = [
        `${props.profileUser.name}.`,
        `Member since ${memberSince.value}.`,
        `${props.stats.totalBooksCount} ${books} created.`,
        `${props.stats.messagesCount} ${messages} posted.`,
        `${props.stats.commentsCount} ${comments} posted.`,
        `${props.stats.reactionsGiven} ${reactions} given.`,
    ].join(" ");

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
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak user summary"
                                        icon-class="ri-speak-fill text-lg"
                                        @click="speakUserSummary"
                                    />
                                </div>
                                <div
                                    v-if="weeklyOverview?.text"
                                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                                >
                                    <p
                                        class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                                    >
                                        {{ weeklyOverview.text }}
                                    </p>
                                    <p
                                        v-if="weeklyOverviewGeneratedAt"
                                        class="text-xs text-gray-500 dark:text-gray-400 mt-2"
                                    >
                                        Updated {{ weeklyOverviewGeneratedAt }}
                                    </p>
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
                                <SpeakButton
                                    v-if="stats.topBooks.length > 0"
                                    :disabled="speaking"
                                    aria-label="Speak top books"
                                    icon-class="ri-speak-fill text-lg"
                                    @click="speakTopBooks"
                                />
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
                                    :href="route('books.show', { book: book?.slug })"
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
                                <SpeakButton
                                    v-if="stats.recentBooks.length > 0"
                                    :disabled="speaking"
                                    aria-label="Speak recent books"
                                    icon-class="ri-speak-fill text-lg"
                                    @click="speakRecentBooks"
                                />
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
                                    :value="`popularity ${
                                        book.popularity_percentage ?? 0
                                    }%`"
                                    :subtitle="`${formatDate(book.created_at)}`"
                                    :href="route('books.show', { book: book?.slug })"
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
                            icon="ri-chat-3-line"
                            icon-color="text-purple-600 dark:text-purple-400"
                            label="Comments Posted"
                            :value="stats.commentsCount"
                        />
                        <StatCard
                            icon="ri-heart-line"
                            icon-color="text-pink-600 dark:text-pink-400"
                            label="Reactions Given"
                            :value="stats.reactionsGiven"
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

                <div
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg mt-6"
                >
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-xl font-bold text-gray-900 dark:text-gray-100"
                            >
                                Recent Replies
                            </h3>
                            <div
                                :class="[
                                    'flex items-center gap-2 px-3 py-1 rounded-full',
                                    recentReplies.length > 0
                                        ? 'bg-purple-100 dark:bg-purple-900'
                                        : 'bg-gray-100 dark:bg-gray-700',
                                ]"
                            >
                                <i
                                    :class="[
                                        'ri-reply-line',
                                        recentReplies.length > 0
                                            ? 'text-purple-600 dark:text-purple-400'
                                            : 'text-gray-600 dark:text-gray-400',
                                    ]"
                                ></i>
                                <span
                                    :class="[
                                        'font-semibold',
                                        recentReplies.length > 0
                                            ? 'text-purple-700 dark:text-purple-300'
                                            : 'text-gray-700 dark:text-gray-300',
                                    ]"
                                >
                                    {{ stats.commentsCount }} total
                                </span>
                            </div>
                        </div>

                        <div v-if="recentReplies.length > 0" class="space-y-3">
                            <div
                                v-for="reply in recentReplies"
                                :key="reply.id"
                                class="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                            >
                                <div
                                    class="flex items-center justify-between gap-3 mb-2"
                                >
                                    <span
                                        class="text-xs text-gray-500 dark:text-gray-400"
                                    >
                                        {{ formatDate(reply.created_at) }}
                                    </span>
                                    <Link
                                        :href="replyMessageLink(reply)"
                                        class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                    >
                                        View message
                                    </Link>
                                </div>
                                <p
                                    class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
                                >
                                    {{ replyPreview(reply.comment) }}
                                </p>
                            </div>
                        </div>
                        <div
                            v-else
                            class="text-center py-4 text-gray-500 dark:text-gray-400"
                        >
                            No replies yet.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>
