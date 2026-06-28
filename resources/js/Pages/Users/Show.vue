<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import MessageTimeline from "@/Components/Messages/MessageTimeline.vue";
import StatCard from "@/Components/StatCard.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { Head, Link, router } from "@inertiajs/vue3";
import { computed, ref } from "vue";

defineOptions({
    name: "UserShow",
});

const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();
const { canAdmin } = usePermissions();
const regenerating = ref(false);

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

const regenerateWeeklyOverview = () => {
    if (regenerating.value) return;

    regenerating.value = true;
    router.post(
        route("users.regenerate-weekly-overview", {
            user: props.profileUser.email,
        }),
        {},
        {
            onFinish: () => {
                regenerating.value = false;
            },
        },
    );
};

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

    return `${normalizedText.slice(0, maxLength)}…`;
};

const speakActivityStat = (key, count) => {
    speak(t(key, { count }));
};

const speakTopBooks = () => {
    const bookTexts = props.stats.topBooks.map((book, index) => {
        return `${index + 1}. ${book.title}`;
    });
    speak(t("profile.top_books_by_popularity", { list: bookTexts.join(". ") }));
};

const speakRecentBooks = () => {
    const bookTexts = props.stats.recentBooks.map((book, index) => {
        return `${index + 1}. ${book.title}`;
    });
    speak(t("profile.recent_books_created", { list: bookTexts.join(". ") }));
};

const speakUserSummary = () => {
    if (props.weeklyOverview?.text) {
        speak(`${props.profileUser.name}. ${props.weeklyOverview.text}`);
        return;
    }

    const booksWord =
        props.stats.totalBooksCount === 1 ? t("general.book") : t("general.books");
    const messagesWord =
        props.stats.messagesCount === 1 ? t("general.message") : t("general.messages");
    const commentsWord =
        props.stats.commentsCount === 1 ? t("general.comment") : t("general.comments");
    const reactionsWord =
        props.stats.reactionsGiven === 1 ? t("general.reaction") : t("general.reactions");

    const summary = [
        `${props.profileUser.name}.`,
        t("profile.member_since", { date: memberSince.value }),
        t("profile.books_created", {
            count: props.stats.totalBooksCount,
            word: booksWord,
        }),
        t("profile.messages_posted", {
            count: props.stats.messagesCount,
            word: messagesWord,
        }),
        t("profile.comments_posted", {
            count: props.stats.commentsCount,
            word: commentsWord,
        }),
        t("profile.reactions_given", {
            count: props.stats.reactionsGiven,
            word: reactionsWord,
        }),
    ].join(" ");

    speak(summary);
};
</script>

<template>
    <Head :title="`${profileUser.name} - Profile`" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="flex items-center gap-2">
                <Link
                    :href="route('profile.edit')"
                    class="inline-flex items-center justify-center min-h-11 min-w-11 -ml-2 text-theme-title opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="All members"
                >
                    <i class="ri-arrow-left-line text-xl"></i>
                </Link>
                <h2 class="font-heading text-2xl text-theme-title leading-tight">
                    {{ profileUser.name }}
                </h2>
            </div>
        </template>

        <div class="pb-12">
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <!-- Profile Header -->
                <div
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg mb-6"
                >
                    <div class="p-6">
                        <div class="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                            <Avatar :user="profileUser" size="xl" class="flex-shrink-0" />
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <h1
                                            class="font-heading text-3xl text-gray-900 dark:text-theme-title mb-1 truncate"
                                        >
                                            {{ profileUser.name }}
                                        </h1>
                                        <p
                                            class="text-sm text-gray-600 dark:text-gray-400 mb-3"
                                        >
                                            {{ profileUser.email }}
                                        </p>
                                        <div
                                            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                                        >
                                            <i class="ri-calendar-line flex-shrink-0"></i>
                                            <span>Member since {{ memberSince }}</span>
                                        </div>
                                    </div>
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak user summary"
                                        icon-class="ri-speak-fill text-lg"
                                        class="flex-shrink-0"
                                        @click="speakUserSummary"
                                    />
                                </div>
                                <div
                                    v-if="weeklyOverview?.text || canAdmin"
                                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                                >
                                    <div v-if="weeklyOverview?.text">
                                        <p class="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                                            Weekly AI story
                                        </p>
                                        <p
                                            class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-w-prose"
                                        >
                                            {{ weeklyOverview.text }}
                                        </p>
                                    </div>
                                    <div
                                        class="flex items-center gap-3 mt-2"
                                    >
                                        <p
                                            v-if="weeklyOverviewGeneratedAt"
                                            class="text-xs text-gray-600 dark:text-gray-400"
                                        >
                                            Updated {{ weeklyOverviewGeneratedAt }}
                                        </p>
                                        <button
                                            v-if="canAdmin"
                                            type="button"
                                            :disabled="regenerating"
                                            title="Generate a new AI story for this profile"
                                            class="btn-bulge inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-700 text-amber-400 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            @click="regenerateWeeklyOverview"
                                        >
                                            <i
                                                class="ri-refresh-line"
                                                :class="{ 'animate-spin': regenerating }"
                                            ></i>
                                            {{
                                                regenerating
                                                    ? "Regenerating..."
                                                    : "Regenerate AI overview"
                                            }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Book Stats -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <!-- Top Books by Popularity -->
                    <div
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3
                                        class="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i class="ri-fire-line text-teal-700 dark:text-teal-400"></i>
                                        Top Books <span class="font-normal text-gray-600 dark:text-gray-400">by popularity</span>
                                    </h3>
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
                                    icon-color="text-teal-700 dark:text-teal-400"
                                    :label="book.title"
                                    :href="route('books.show', { book: book?.slug })"
                                    :cover-image="book.cover_image?.media_path"
                                />
                            </div>
                            <p
                                v-else
                                class="text-center py-4 text-gray-600 dark:text-gray-400"
                            >
                                No books created yet.
                            </p>
                        </div>
                    </div>

                    <!-- Recently Created -->
                    <div
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3
                                        class="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i class="ri-book-2-line text-amber-500 dark:text-amber-400"></i>
                                        Recently Created
                                    </h3>
                                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                        {{ stats.totalBooksCount }} books total
                                    </p>
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
                                    icon-color="text-amber-500 dark:text-amber-400"
                                    :label="book.title"
                                    :value="`popularity ${
                                        book.popularity_percentage ?? 0
                                    }%`"
                                    :subtitle="`${formatDate(book.created_at)}`"
                                    :href="route('books.show', { book: book?.slug })"
                                    :cover-image="book.cover_image?.media_path"
                                />
                            </div>
                            <p
                                v-else
                                class="text-center py-4 text-gray-600 dark:text-gray-400"
                            >
                                No books created yet.
                            </p>
                        </div>
                    </div>

                    <!-- Activity Summary -->
                    <div
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <h3
                                class="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
                            >
                                <i class="ri-bar-chart-line text-teal-700 dark:text-teal-400"></i>
                                Activity
                            </h3>
                            <div class="space-y-3">
                                <StatCard
                                    icon="ri-book-line"
                                    icon-color="text-teal-700 dark:text-teal-400"
                                    label="Total Books"
                                    :value="stats.totalBooksCount"
                                >
                                    <template #action>
                                        <SpeakButton
                                            :disabled="speaking"
                                            aria-label="Speak total books"
                                            icon-class="ri-speak-fill text-lg"
                                            @click="speakActivityStat('profile.stat_total_books', stats.totalBooksCount)"
                                        />
                                    </template>
                                </StatCard>
                                <StatCard
                                    icon="ri-chat-3-line"
                                    icon-color="text-amber-500 dark:text-amber-400"
                                    label="Comments Posted"
                                    :value="stats.commentsCount"
                                >
                                    <template #action>
                                        <SpeakButton
                                            :disabled="speaking"
                                            aria-label="Speak comments posted"
                                            icon-class="ri-speak-fill text-lg"
                                            @click="speakActivityStat('profile.stat_comments', stats.commentsCount)"
                                        />
                                    </template>
                                </StatCard>
                                <StatCard
                                    icon="ri-heart-line"
                                    icon-color="text-pink-600 dark:text-pink-400"
                                    label="Reactions Given"
                                    :value="stats.reactionsGiven"
                                >
                                    <template #action>
                                        <SpeakButton
                                            :disabled="speaking"
                                            aria-label="Speak reactions given"
                                            icon-class="ri-speak-fill text-lg"
                                            @click="speakActivityStat('profile.stat_reactions', stats.reactionsGiven)"
                                        />
                                    </template>
                                </StatCard>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Messages -->
                <div
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg mb-6"
                >
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                            >
                                <i class="ri-message-3-line text-teal-700 dark:text-teal-400"></i>
                                Recent Messages
                            </h3>
                            <div class="flex items-center gap-2">
                                <span class="text-sm text-gray-600 dark:text-gray-400">
                                    {{ stats.messagesCount }} total
                                </span>
                                <SpeakButton
                                    :disabled="speaking"
                                    aria-label="Speak messages count"
                                    icon-class="ri-speak-fill text-lg"
                                    @click="speakActivityStat('profile.stat_messages', stats.messagesCount)"
                                />
                            </div>
                        </div>
                        <MessageTimeline
                            v-if="recentMessages.length > 0"
                            :messages="recentMessages"
                            read-only
                        />
                        <p
                            v-else
                            class="text-center py-4 text-gray-600 dark:text-gray-400"
                        >
                            No messages yet.
                        </p>
                    </div>
                </div>

                <!-- Recent Replies -->
                <div
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                >
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                            >
                                <i class="ri-reply-line text-teal-700 dark:text-teal-400"></i>
                                Recent Replies
                            </h3>
                            <div class="flex items-center gap-2">
                                <span class="text-sm text-gray-600 dark:text-gray-400">
                                    {{ stats.commentsCount }} total
                                </span>
                                <SpeakButton
                                    :disabled="speaking"
                                    aria-label="Speak comments count"
                                    icon-class="ri-speak-fill text-lg"
                                    @click="speakActivityStat('profile.stat_comments', stats.commentsCount)"
                                />
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
                                        class="text-xs text-gray-600 dark:text-gray-400"
                                    >
                                        {{ formatDate(reply.created_at) }}
                                    </span>
                                    <Link
                                        :href="replyMessageLink(reply)"
                                        class="inline-flex items-center gap-1 text-sm font-medium text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 py-1 px-2 -mr-2 rounded transition-colors"
                                    >
                                        <i class="ri-external-link-line text-xs"></i>
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
                        <p
                            v-else
                            class="text-center py-4 text-gray-600 dark:text-gray-400"
                        >
                            No replies yet.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>
