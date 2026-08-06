<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import Button from "@/Components/Button.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import FormModal from "@/Components/FormModal.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import MessageTimeline from "@/Components/Messages/MessageTimeline.vue";
import StatCard from "@/Components/StatCard.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import NewBookForm from "@/Pages/Books/NewBookForm.vue";
import OwnerPanel from "@/Pages/Users/Partials/OwnerPanel.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { useNotificationSync } from "@/composables/useNotificationSync";
import { usePermissions } from "@/composables/permissions";
import { FOOD_EMOJI_POOL, useEmojiRise } from "@/composables/useEmojiRise";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { Head, Link, router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { computed, onMounted, onUnmounted, ref } from "vue";

defineOptions({
    name: "UserShow",
});

const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();
const { canAdmin, canEditPages } = usePermissions();
const { spawnEmojiRise } = useEmojiRise();
const { isRead, markAsRead: markNotificationAsRead } = useNotificationSync();
const { setFlashMessage } = useFlashMessage();
const {
    show: confirmUnblockShow,
    message: confirmUnblockMessage,
    ask: askConfirmUnblock,
    onConfirmed: onConfirmUnblockConfirmed,
    onCancelled: onConfirmUnblockCancelled,
} = useConfirmDialog();
const regenerating = ref(false);
const showNewBookForm = ref(false);
const newBookFormRef = ref(null);
const unlockingBlockedPages = ref(false);

const unblockAllPages = async () => {
    if (unlockingBlockedPages.value) return;
    const ok = await askConfirmUnblock(
        t("dashboard.confirm_unblock_all_pages")
    );
    if (!ok) return;
    unlockingBlockedPages.value = true;
    try {
        const { data } = await axios.post(
            route("pages.unblock-all"),
            {},
            { headers: { Accept: "application/json" } }
        );
        setFlashMessage("success", data.message);
        router.reload({
            only: ["blockedCount"],
            preserveScroll: true,
            async: true,
        });
    } finally {
        unlockingBlockedPages.value = false;
    }
};

const openNewBookForm = () => {
    showNewBookForm.value = true;
};

const messagingEnabled = computed(() => {
    const value = usePage().props.settings?.messaging_enabled;
    return value === "1" || value === 1 || value === true;
});

function scrollToAdministration() {
    document
        .getElementById("administration")
        ?.scrollIntoView({ behavior: "smooth" });
}

const props = defineProps({
    profileUser: {
        type: Object,
        required: true,
    },
    isOwner: {
        type: Boolean,
        default: false,
    },
    appName: {
        type: String,
        default: "",
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
    recentActivity: {
        type: Object,
        default: () => ({ replies: [], mentions: [] }),
    },
    newBooksThisWeek: {
        type: Array,
        default: () => [],
    },
    recentUploads: {
        type: Array,
        default: () => [],
    },
    authors: {
        type: Array,
        default: () => [],
    },
    newBookCategories: {
        type: Array,
        default: () => [],
    },
    adminUsers: {
        type: Array,
        default: () => [],
    },
    users: {
        type: Array,
        default: () => [],
    },
    categories: {
        type: Array,
        default: () => [],
    },
    blockedCount: {
        type: Number,
        default: 0,
    },
    siteStats: {
        type: Object,
        default: () => ({}),
    },
    adminSettings: {
        type: Array,
        default: () => [],
    },
    defaultCities: {
        type: Array,
        default: () => [],
    },
    maxCities: {
        type: Number,
        default: 6,
    },
    timezoneLabels: {
        type: Object,
        default: () => ({}),
    },
    worldClock: {
        type: Object,
        default: null,
    },
});

let tootFoodsTimer = null;

const scheduleTootFoodsRise = (minDelay = 8000, maxDelay = 22000) => {
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    tootFoodsTimer = setTimeout(() => {
        spawnEmojiRise(1, {
            pool: FOOD_EMOJI_POOL,
            minDuration: 7,
            maxDuration: 11,
        });
        scheduleTootFoodsRise();
    }, delay);
};

onMounted(() => {
    if (props.isOwner) {
        scheduleTootFoodsRise(2000, 4000);
    }
});

onUnmounted(() => {
    clearTimeout(tootFoodsTimer);
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
        }
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
    speak(t("profile.user_top_books", { name: props.profileUser.name }));
};

const speakRecentBooks = () => {
    speak(t("profile.user_recently_created", { name: props.profileUser.name }));
};

const repliesToYou = computed(() => {
    return (props.recentActivity?.replies ?? [])
        .filter((reply) => !isRead(reply.id))
        .map((reply) => ({
            id: reply.id,
            created_at: reply.created_at,
            actorName: reply.data?.commenter_name ?? "Someone",
            preview: replyPreview(
                reply.data?.comment ?? reply.data?.message ?? ""
            ),
            href: reply.data?.url ?? route("messages.index"),
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
});

const messagesToYou = computed(() => {
    return (props.recentActivity?.mentions ?? [])
        .filter((mention) => !isRead(mention.id))
        .map((mention) => ({
            id: mention.id,
            created_at: mention.created_at,
            actorName: mention.data?.tagger_name ?? "Someone",
            preview: replyPreview(mention.data?.message ?? ""),
            href: mention.data?.url ?? route("messages.index"),
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
});

const hasRepliesToYou = computed(() => repliesToYou.value.length > 0);
const hasMessagesToYou = computed(() => messagesToYou.value.length > 0);

const speakRepliesToYou = () => {
    const texts = repliesToYou.value.map(
        (item) =>
            `${item.actorName} ${t("profile.activity_reply")}: ${item.preview}`
    );
    speak(t("profile.speak_replies_to_you", { list: texts.join(". ") }));
};

const speakMessagesToYou = () => {
    const texts = messagesToYou.value.map(
        (item) =>
            `${item.actorName} ${t("profile.activity_mention")}: ${
                item.preview
            }`
    );
    speak(t("profile.speak_messages_to_you", { list: texts.join(". ") }));
};

const speakNewBooksThisWeek = () => {
    speak(t("profile.new_books_this_week"));
};

const speakRecentUploads = () => {
    speak(t("profile.recent_uploads"));
};

const speakUserSummary = () => {
    const greeting = props.isOwner
        ? t("profile.welcome_with_name", {
              app_name: props.appName,
              name: props.profileUser.name,
          })
        : `${props.profileUser.name}.`;

    if (props.weeklyOverview?.text) {
        speak(`${greeting} ${props.weeklyOverview.text}`);
        return;
    }

    const booksWord =
        props.stats.totalBooksCount === 1
            ? t("general.book")
            : t("general.books");
    const messagesWord =
        props.stats.messagesCount === 1
            ? t("general.message")
            : t("general.messages");
    const commentsWord =
        props.stats.commentsCount === 1
            ? t("general.comment")
            : t("general.comments");
    const reactionsWord =
        props.stats.reactionsGiven === 1
            ? t("general.reaction")
            : t("general.reactions");

    const summary = [
        greeting,
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
                    v-if="!isOwner"
                    :href="route('welcome')"
                    class="inline-flex items-center justify-center min-h-11 min-w-11 -ml-2 text-theme-title opacity-70 hover:opacity-100 transition-opacity"
                    :aria-label="t('profile.back_to_dashboard')"
                >
                    <i class="ri-arrow-left-line text-xl"></i>
                </Link>
                <!-- Title intentionally omitted: the name/greeting is already
                     shown in the profile card (and hero) below. -->
                <button
                    v-if="isOwner && canAdmin"
                    type="button"
                    class="inline-flex items-center justify-center min-h-11 min-w-11 text-theme-title opacity-70 hover:opacity-100 transition-opacity ml-auto"
                    :aria-label="t('profile.jump_to_administration')"
                    @click="scrollToAdministration"
                >
                    <i class="ri-settings-3-line text-xl"></i>
                </button>
            </div>
        </template>

        <div class="pb-12">
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <!-- Hero: welcome summary + quick actions (all owners) -->
                <div
                    v-if="isOwner"
                    class="bg-indigo-700 dark:bg-indigo-800 overflow-hidden shadow-sm rounded-lg mb-6 p-6"
                >
                    <div class="flex items-start justify-between gap-3 min-w-0">
                        <div class="flex items-start gap-4 min-w-0">
                            <Avatar
                                :user="profileUser"
                                size="xl"
                                class="flex-shrink-0"
                            />
                            <div class="min-w-0">
                                <h3
                                    class="font-heading text-2xl text-amber-400 leading-tight [text-wrap:balance] break-words"
                                >
                                    {{
                                        t("profile.welcome_with_name", {
                                            app_name: appName,
                                            name: profileUser.name,
                                        })
                                    }}
                                </h3>
                                <p
                                    class="text-indigo-100 text-xs mt-1.5 truncate"
                                >
                                    {{ profileUser.email }}
                                </p>
                                <div
                                    class="flex items-center gap-1.5 text-indigo-200 text-xs mt-1"
                                >
                                    <i
                                        class="ri-calendar-line flex-shrink-0"
                                    ></i>
                                    <span>Member since {{ memberSince }}</span>
                                </div>
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

                    <!-- AI weekly summary -->
                    <div
                        class="mt-4 pt-4 border-t border-indigo-500/40 dark:border-indigo-600/40"
                    >
                        <p
                            class="text-indigo-50 text-sm whitespace-pre-wrap max-w-prose"
                        >
                            {{
                                weeklyOverview?.text ||
                                t("dashboard.hero_default_summary")
                            }}
                        </p>
                        <p
                            v-if="
                                weeklyOverview?.text &&
                                weeklyOverviewGeneratedAt
                            "
                            class="text-indigo-200 text-xs mt-1"
                        >
                            {{
                                t("dashboard.hero_summary_updated", {
                                    date: weeklyOverviewGeneratedAt,
                                })
                            }}
                        </p>
                    </div>

                    <!-- Quick actions: equal-width, inline on desktop, each
                         stacked full-width on mobile -->
                    <div class="mt-4 flex flex-col items-start gap-3">
                        <div class="flex w-full flex-col gap-3 sm:flex-row">
                            <!-- Primary CTA: create a new book (edit-pages only) -->
                            <template v-if="canEditPages">
                                <Button
                                    v-if="!showNewBookForm"
                                    type="button"
                                    class="w-full justify-center ring-2 ring-amber-400/70 shadow-lg sm:flex-1"
                                    @click="openNewBookForm"
                                >
                                    <i class="ri-add-line mr-1.5 text-base"></i>
                                    {{ t("dashboard.add_new_book") }}
                                </Button>
                                <Button
                                    v-else
                                    type="button"
                                    class="w-full justify-center !bg-red-700 sm:flex-1"
                                    @click="showNewBookForm = false"
                                >
                                    {{ t("dashboard.close_book_form") }}
                                </Button>
                            </template>

                            <!-- Unblock all blocked pages/sounds (edit-pages only) -->
                            <ConfirmDialog
                                v-model:show="confirmUnblockShow"
                                :message="confirmUnblockMessage"
                                confirm-variant="primary"
                                @confirm="onConfirmUnblockConfirmed"
                                @cancel="onConfirmUnblockCancelled"
                            />
                            <button
                                v-if="canEditPages"
                                type="button"
                                :disabled="
                                    unlockingBlockedPages || blockedCount === 0
                                "
                                :aria-label="
                                    t('dashboard.unlock_all_blocked_pages_aria')
                                "
                                class="btn-bulge inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-amber-700 px-3 py-2.5 text-center text-sm font-semibold leading-tight text-amber-50 transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                                @click="unblockAllPages"
                            >
                                <i
                                    v-if="unlockingBlockedPages"
                                    class="ri-loader-line flex-shrink-0 animate-spin"
                                ></i>
                                <i
                                    v-else
                                    class="ri-lock-unlock-line flex-shrink-0"
                                ></i>
                                {{ t("dashboard.unlock_all_blocked_pages") }}
                                ({{ blockedCount }})
                            </button>

                            <!-- Secondary CTA: chat (all users). Alone (no
                                 edit-pages permission), it fills the row. -->
                            <Link
                                v-if="messagingEnabled"
                                :href="route('messages.index')"
                                class="btn-bulge inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-orange-700 px-3 py-2.5 text-center text-sm font-semibold leading-tight text-amber-50 transition-colors hover:bg-orange-600 sm:flex-1"
                            >
                                <i class="ri-chat-3-line flex-shrink-0"></i>
                                {{ t("dashboard.browse_chat") }}
                            </Link>
                        </div>

                        <!-- Regenerate AI summary (admins only, low-emphasis) -->
                        <button
                            v-if="canAdmin"
                            type="button"
                            :disabled="regenerating"
                            title="Generate a new AI story for this profile"
                            class="btn-bulge inline-flex items-center gap-1.5 text-xs font-medium text-indigo-200 transition-colors hover:text-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
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

                    <FormModal
                        v-if="canEditPages"
                        :show="showNewBookForm"
                        :title="t('book.new_book_title')"
                        :submit-ref="newBookFormRef"
                        @close="showNewBookForm = false"
                    >
                        <NewBookForm
                            ref="newBookFormRef"
                            :authors="authors"
                            :categories="newBookCategories"
                            @close-form="showNewBookForm = false"
                        />
                    </FormModal>
                </div>

                <!-- Profile Header (visitors only; owners see this in the hero) -->
                <div
                    v-if="!isOwner"
                    class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg mb-6"
                >
                    <div class="p-6">
                        <div
                            class="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6"
                        >
                            <Avatar
                                :user="profileUser"
                                size="xl"
                                class="flex-shrink-0"
                            />
                            <div class="flex-1 min-w-0">
                                <div
                                    class="flex items-start justify-between gap-3"
                                >
                                    <div class="min-w-0">
                                        <h1
                                            class="font-heading text-3xl text-gray-900 dark:text-theme-title mb-1 truncate"
                                        >
                                            {{
                                                isOwner
                                                    ? t(
                                                          "profile.welcome_with_name",
                                                          {
                                                              app_name: appName,
                                                              name: profileUser.name,
                                                          }
                                                      )
                                                    : profileUser.name
                                            }}
                                        </h1>
                                        <p
                                            class="text-sm text-gray-600 dark:text-gray-400 mb-3"
                                        >
                                            {{ profileUser.email }}
                                        </p>
                                        <div
                                            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                                        >
                                            <i
                                                class="ri-calendar-line flex-shrink-0"
                                            ></i>
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
                                        class="flex-shrink-0"
                                        @click="speakUserSummary"
                                    />
                                </div>
                                <div
                                    v-if="weeklyOverview?.text || canAdmin"
                                    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                                >
                                    <div v-if="weeklyOverview?.text">
                                        <p
                                            class="text-xs text-gray-600 dark:text-gray-400 mb-1.5"
                                        >
                                            Weekly AI story
                                        </p>
                                        <p
                                            class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-w-prose"
                                        >
                                            {{ weeklyOverview.text }}
                                        </p>
                                    </div>
                                    <div class="flex items-center gap-3 mt-2">
                                        <p
                                            v-if="weeklyOverviewGeneratedAt"
                                            class="text-xs text-gray-600 dark:text-gray-400"
                                        >
                                            Updated
                                            {{ weeklyOverviewGeneratedAt }}
                                        </p>
                                        <button
                                            v-if="canAdmin"
                                            type="button"
                                            :disabled="regenerating"
                                            title="Generate a new AI story for this profile"
                                            class="btn-bulge inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-theme-primary text-amber-400 hover:bg-theme-button disabled:opacity-50 disabled:cursor-not-allowed"
                                            @click="regenerateWeeklyOverview"
                                        >
                                            <i
                                                class="ri-refresh-line"
                                                :class="{
                                                    'animate-spin':
                                                        regenerating,
                                                }"
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

                <!-- Visitor sections: books, activity, and posts flow into one
                     responsive grid that wraps and fills, so missing cards never
                     leave a fixed-column gap. -->
                <div
                    v-if="!isOwner"
                    class="grid items-start gap-6 mb-6 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]"
                >
                    <!-- Top Books by Popularity -->
                    <div
                        v-if="stats.topBooks.length > 0"
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3
                                        class="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i
                                            class="ri-fire-line text-indigo-700 dark:text-indigo-400"
                                        ></i>
                                        {{
                                            t("profile.user_top_books", {
                                                name: profileUser.name,
                                            })
                                        }}
                                        <span
                                            class="font-normal text-gray-600 dark:text-gray-400"
                                            >by popularity</span
                                        >
                                    </h3>
                                </div>
                                <SpeakButton
                                    :disabled="speaking"
                                    aria-label="Speak top books"
                                    icon-class="ri-speak-fill text-lg"
                                    @click="speakTopBooks"
                                />
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <StatCard
                                    v-for="book in stats.topBooks"
                                    :key="book.id"
                                    icon="ri-book-line"
                                    icon-color="text-indigo-700 dark:text-indigo-400"
                                    :label="book.title"
                                    :href="
                                        route('books.show', {
                                            book: book?.slug,
                                        })
                                    "
                                    :cover-image="book.cover_image?.media_path"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Recently Created -->
                    <div
                        v-if="stats.recentBooks.length > 0"
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h3
                                        class="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i
                                            class="ri-book-2-line text-amber-500 dark:text-amber-400"
                                        ></i>
                                        {{
                                            t("profile.user_recently_created", {
                                                name: profileUser.name,
                                            })
                                        }}
                                    </h3>
                                    <p
                                        class="text-sm text-gray-600 dark:text-gray-400 mt-0.5"
                                    >
                                        {{ stats.totalBooksCount }} books total
                                    </p>
                                </div>
                                <SpeakButton
                                    :disabled="speaking"
                                    aria-label="Speak recent books"
                                    icon-class="ri-speak-fill text-lg"
                                    @click="speakRecentBooks"
                                />
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    :href="
                                        route('books.show', {
                                            book: book?.slug,
                                        })
                                    "
                                    :cover-image="book.cover_image?.media_path"
                                />
                            </div>
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
                                <i
                                    class="ri-bar-chart-line text-indigo-700 dark:text-indigo-400"
                                ></i>
                                Activity
                            </h3>
                            <div class="space-y-3">
                                <StatCard
                                    icon="ri-book-line"
                                    icon-color="text-indigo-700 dark:text-indigo-400"
                                    label="Total Books"
                                    :value="stats.totalBooksCount"
                                >
                                    <template #action>
                                        <SpeakButton
                                            :disabled="speaking"
                                            aria-label="Speak total books"
                                            icon-class="ri-speak-fill text-lg"
                                            @click="
                                                speakActivityStat(
                                                    'profile.stat_total_books',
                                                    stats.totalBooksCount
                                                )
                                            "
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
                                            @click="
                                                speakActivityStat(
                                                    'profile.stat_comments',
                                                    stats.commentsCount
                                                )
                                            "
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
                                            @click="
                                                speakActivityStat(
                                                    'profile.stat_reactions',
                                                    stats.reactionsGiven
                                                )
                                            "
                                        />
                                    </template>
                                </StatCard>
                            </div>
                        </div>
                    </div>

                    <!-- Latest messages posted by this user -->
                    <div
                        v-if="recentMessages.length > 0"
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3
                                    class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                >
                                    <i
                                        class="ri-message-3-line text-indigo-700 dark:text-indigo-400"
                                    ></i>
                                    {{
                                        t("profile.user_latest_messages", {
                                            name: profileUser.name,
                                        })
                                    }}
                                </h3>
                                <div class="flex items-center gap-2">
                                    <span
                                        class="text-sm text-gray-600 dark:text-gray-400"
                                    >
                                        {{ stats.messagesCount }} total
                                    </span>
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak messages count"
                                        icon-class="ri-speak-fill text-lg"
                                        @click="
                                            speakActivityStat(
                                                'profile.stat_messages',
                                                stats.messagesCount
                                            )
                                        "
                                    />
                                </div>
                            </div>
                            <MessageTimeline
                                :messages="recentMessages"
                                read-only
                            />
                        </div>
                    </div>

                    <div
                        v-if="recentReplies.length > 0"
                        class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                    >
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3
                                    class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                >
                                    <i
                                        class="ri-reply-line text-indigo-700 dark:text-indigo-400"
                                    ></i>
                                    {{
                                        t("profile.user_latest_replies", {
                                            name: profileUser.name,
                                        })
                                    }}
                                </h3>
                                <div class="flex items-center gap-2">
                                    <span
                                        class="text-sm text-gray-600 dark:text-gray-400"
                                    >
                                        {{ stats.commentsCount }} total
                                    </span>
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak comments count"
                                        icon-class="ri-speak-fill text-lg"
                                        @click="
                                            speakActivityStat(
                                                'profile.stat_comments',
                                                stats.commentsCount
                                            )
                                        "
                                    />
                                </div>
                            </div>

                            <div class="space-y-3">
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
                                            class="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 py-1 px-2 -mr-2 rounded transition-colors"
                                        >
                                            <i
                                                class="ri-external-link-line text-xs"
                                            ></i>
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
                        </div>
                    </div>
                </div>

                <template v-if="isOwner">
                    <!-- Your dashboard: replies/mentions to you plus your recent
                         books and uploads flow into one responsive grid that
                         wraps and fills, so missing cards never leave a gap. -->
                    <div
                        v-if="
                            hasRepliesToYou ||
                            hasMessagesToYou ||
                            newBooksThisWeek.length > 0 ||
                            recentUploads.length > 0
                        "
                        class="grid items-start gap-6 mt-6 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]"
                    >
                        <div
                            v-if="hasRepliesToYou"
                            class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                        >
                            <div class="p-6">
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <h3
                                        class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i
                                            class="ri-reply-line text-indigo-700 dark:text-indigo-400"
                                        ></i>
                                        {{ t("profile.replies_to_you") }}
                                    </h3>
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak replies to you"
                                        icon-class="ri-speak-fill text-lg"
                                        @click="speakRepliesToYou"
                                    />
                                </div>

                                <div class="space-y-3">
                                    <div
                                        v-for="item in repliesToYou"
                                        :key="item.id"
                                        class="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                    >
                                        <div
                                            class="flex items-center justify-between gap-3 mb-2"
                                        >
                                            <span
                                                class="text-xs text-gray-600 dark:text-gray-400"
                                            >
                                                {{
                                                    formatDate(item.created_at)
                                                }}
                                            </span>
                                            <div
                                                class="flex items-center gap-1"
                                            >
                                                <button
                                                    type="button"
                                                    title="Mark as read"
                                                    class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                                                    @click="
                                                        markNotificationAsRead(
                                                            item.id
                                                        )
                                                    "
                                                >
                                                    Mark read
                                                </button>
                                                <Link
                                                    :href="item.href"
                                                    class="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 py-1 px-2 -mr-2 rounded transition-colors"
                                                    @click="
                                                        markNotificationAsRead(
                                                            item.id
                                                        )
                                                    "
                                                >
                                                    <i
                                                        class="ri-external-link-line text-xs"
                                                    ></i>
                                                    View message
                                                </Link>
                                            </div>
                                        </div>
                                        <p
                                            class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
                                        >
                                            <span class="font-medium">{{
                                                item.actorName
                                            }}</span>
                                            {{ t("profile.activity_reply") }}:
                                            {{ item.preview }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            v-if="hasMessagesToYou"
                            class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                        >
                            <div class="p-6">
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <h3
                                        class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i
                                            class="ri-notification-3-line text-indigo-700 dark:text-indigo-400"
                                        ></i>
                                        {{ t("profile.messages_to_you") }}
                                    </h3>
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak messages for you"
                                        icon-class="ri-speak-fill text-lg"
                                        @click="speakMessagesToYou"
                                    />
                                </div>

                                <div class="space-y-3">
                                    <div
                                        v-for="item in messagesToYou"
                                        :key="item.id"
                                        class="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                    >
                                        <div
                                            class="flex items-center justify-between gap-3 mb-2"
                                        >
                                            <span
                                                class="text-xs text-gray-600 dark:text-gray-400"
                                            >
                                                {{
                                                    formatDate(item.created_at)
                                                }}
                                            </span>
                                            <div
                                                class="flex items-center gap-1"
                                            >
                                                <button
                                                    type="button"
                                                    title="Mark as read"
                                                    class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                                                    @click="
                                                        markNotificationAsRead(
                                                            item.id
                                                        )
                                                    "
                                                >
                                                    Mark read
                                                </button>
                                                <Link
                                                    :href="item.href"
                                                    class="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 py-1 px-2 -mr-2 rounded transition-colors"
                                                    @click="
                                                        markNotificationAsRead(
                                                            item.id
                                                        )
                                                    "
                                                >
                                                    <i
                                                        class="ri-external-link-line text-xs"
                                                    ></i>
                                                    View message
                                                </Link>
                                            </div>
                                        </div>
                                        <p
                                            class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
                                        >
                                            <span class="font-medium">{{
                                                item.actorName
                                            }}</span>
                                            {{ t("profile.activity_mention") }}:
                                            {{ item.preview }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- New books this week posted by you -->
                        <div
                            v-if="newBooksThisWeek.length > 0"
                            class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                        >
                            <div class="p-6">
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <h3
                                        class="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i
                                            class="ri-book-3-line text-indigo-700 dark:text-indigo-400"
                                        ></i>
                                        {{ t("profile.new_books_this_week") }}
                                    </h3>
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak new books this week"
                                        icon-class="ri-speak-fill text-lg"
                                        @click="speakNewBooksThisWeek"
                                    />
                                </div>
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >
                                    <StatCard
                                        v-for="book in newBooksThisWeek"
                                        :key="book.id"
                                        icon="ri-book-line"
                                        icon-color="text-indigo-700 dark:text-indigo-400"
                                        :label="book.title"
                                        :subtitle="formatDate(book.created_at)"
                                        :href="
                                            route('books.show', {
                                                book: book?.slug,
                                            })
                                        "
                                        :cover-image="
                                            book.cover_image?.media_path
                                        "
                                    />
                                </div>
                            </div>
                        </div>

                        <div
                            v-if="recentUploads.length > 0"
                            class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"
                        >
                            <div class="p-6">
                                <div
                                    class="flex items-center justify-between mb-4"
                                >
                                    <h3
                                        class="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                    >
                                        <i
                                            class="ri-image-line text-amber-500 dark:text-amber-400"
                                        ></i>
                                        {{ t("profile.recent_uploads") }}
                                    </h3>
                                    <SpeakButton
                                        :disabled="speaking"
                                        aria-label="Speak recent uploads"
                                        icon-class="ri-speak-fill text-lg"
                                        @click="speakRecentUploads"
                                    />
                                </div>
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >
                                    <StatCard
                                        v-for="page in recentUploads"
                                        :key="page.id"
                                        icon="ri-image-line"
                                        icon-color="text-amber-500 dark:text-amber-400"
                                        :label="
                                            page.book?.title ??
                                            t('profile.untitled_book')
                                        "
                                        :subtitle="formatDate(page.created_at)"
                                        :href="
                                            route('pages.show', {
                                                page: page.id,
                                            })
                                        "
                                        :cover-image="page.media_path"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Admin / preference tools -->
                    <div class="mt-6">
                        <OwnerPanel
                            :admin-users="adminUsers"
                            :users="users"
                            :site-stats="siteStats"
                            :categories="categories"
                            :admin-settings="adminSettings"
                            :blocked-count="blockedCount"
                            :default-cities="defaultCities"
                            :max-cities="maxCities"
                            :timezone-labels="timezoneLabels"
                            :world-clock="worldClock"
                        />
                    </div>
                </template>
            </div>
        </div>
    </BreezeAuthenticatedLayout>
</template>
