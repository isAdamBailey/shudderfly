<template>
    <div
        class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border-l-4 border-blue-400 dark:border-blue-500 ml-2"
    >
        <!-- Header with buttons -->
        <div class="flex items-start justify-between mb-1">
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <Avatar :user="comment.user" size="sm" />
                <Link
                    v-if="comment.user?.email"
                    :href="route('users.show', comment.user.email)"
                    class="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    {{ comment.user.name }}
                </Link>
                <span
                    v-else
                    class="font-semibold text-sm text-gray-900 dark:text-gray-100"
                >
                    {{ comment.user?.name || "Unknown User" }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDate(comment.created_at) }}
                </span>
            </div>
            <!-- Actions menu -->
            <div class="flex items-center flex-shrink-0 ml-2">
                <Dropdown align="right" width="48">
                    <template #trigger>
                        <button
                            type="button"
                            class="w-8 h-8 p-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            :title="t('comment.actions')"
                            :aria-label="t('comment.actions')"
                        >
                            <i class="ri-more-2-fill text-lg"></i>
                        </button>
                    </template>
                    <template #content>
                        <button
                            type="button"
                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out"
                            @click="$emit('reply', comment)"
                        >
                            <div class="flex items-center gap-2">
                                <i class="ri-reply-line"></i>
                                <span>{{ t("comment.reply") }}</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            :disabled="speaking"
                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="$emit('speak', comment)"
                        >
                            <div class="flex items-center gap-2">
                                <i class="ri-speak-fill"></i>
                                <span>{{ t("comment.speak") }}</span>
                            </div>
                        </button>
                        <button
                            v-if="canAdmin"
                            type="button"
                            class="block w-full px-4 py-2 text-left text-sm leading-5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none transition duration-150 ease-in-out"
                            @click="$emit('delete', comment.id)"
                        >
                            <div class="flex items-center gap-2">
                                <i class="ri-delete-bin-line"></i>
                                <span>{{ t("comment.delete") }}</span>
                            </div>
                        </button>
                    </template>
                </Dropdown>
            </div>
        </div>

        <!-- Content area -->
        <div class="w-full">
            <div
                class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
                v-html="formatComment(comment.comment)"
            ></div>
            <!-- Comment Reactions -->
            <CommentReactions
                :grouped-reactions="comment.grouped_reactions || {}"
                :selected-reactions="selectedCommentReactions"
                :current-user-id="currentUserId"
                @toggle-reaction="(emoji) => $emit('toggle-reaction', emoji)"
                @add-reaction="$emit('add-reaction')"
            />
        </div>
    </div>
</template>

<script setup>
import Avatar from "@/Components/Avatar.vue";
import CommentReactions from "@/Components/Messages/CommentReactions.vue";
import Dropdown from "@/Components/Dropdown.vue";
import { usePermissions } from "@/composables/permissions";
import { useTranslations } from "@/composables/useTranslations";
import { Link } from "@inertiajs/vue3";
import { computed } from "vue";

const props = defineProps({
    comment: {
        type: Object,
        required: true,
    },
    speaking: {
        type: Boolean,
        default: false,
    },
    currentUserId: {
        type: Number,
        default: null,
    },
    users: {
        type: Array,
        default: () => [],
    },
});

defineEmits(["speak", "delete", "toggle-reaction", "add-reaction", "reply"]);

const { canAdmin } = usePermissions();
const { t } = useTranslations();

const formatComment = (text) => {
    if (!text) return "";

    let formatted = text;

    if (props.users && props.users.length > 0) {
        const sortedUsers = [...props.users].sort(
            (a, b) => b.name.length - a.name.length
        );

        for (const user of sortedUsers) {
            const escapedName = user.name.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const blockquotePattern1 = new RegExp(
                `@${escapedName}\\n>\\s*([^\\n]*)`,
                "gi"
            );
            formatted = formatted.replace(
                blockquotePattern1,
                (match, quote) => {
                    const trimmedQuote = quote.trim();
                    if (trimmedQuote) {
                        return `<span class="font-semibold text-blue-600 dark:text-blue-400">@${user.name}</span>\n<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 py-1 my-2 italic text-gray-600 dark:text-gray-400">${trimmedQuote}</blockquote>`;
                    }
                    return match;
                }
            );

            const blockquotePattern2 = new RegExp(
                `@${escapedName}\\s*>\\s*([^\\n]*)`,
                "gi"
            );
            formatted = formatted.replace(
                blockquotePattern2,
                (match, quote) => {
                    if (!match.includes("<blockquote")) {
                        const trimmedQuote = quote.trim();
                        if (trimmedQuote) {
                            return `<span class="font-semibold text-blue-600 dark:text-blue-400">@${user.name}</span> <blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 py-1 my-2 italic text-gray-600 dark:text-gray-400">${trimmedQuote}</blockquote>`;
                        }
                    }
                    return match;
                }
            );
        }
    }

    if (props.users && props.users.length > 0) {
        const sortedUsers = [...props.users].sort(
            (a, b) => b.name.length - a.name.length
        );

        for (const user of sortedUsers) {
            const escapedName = user.name.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );
            const pattern = new RegExp(
                `@${escapedName}(?=\\s|$|[^\\w\\s>\\n])`,
                "gi"
            );
            formatted = formatted.replace(pattern, (match) => {
                if (!match.includes("<span")) {
                    return `<span class="font-semibold text-blue-600 dark:text-blue-400">@${user.name}</span>`;
                }
                return match;
            });
        }
    }

    formatted = formatted.replace(
        /@([a-zA-Z0-9_]+)(?!\w)/g,
        (match, username) => {
            if (!match.includes("<span")) {
                return `<span class="font-semibold text-blue-600 dark:text-blue-400">@${username}</span>`;
            }
            return match;
        }
    );

    formatted = formatted.replace(
        /(<span[^>]*>@[^<]+<\/span>)\n>\s*([^\n<]*)/g,
        (match, mentionSpan, quote) => {
            const trimmedQuote = quote.trim();
            if (trimmedQuote) {
                return `${mentionSpan}\n<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 py-1 my-2 italic text-gray-600 dark:text-gray-400">${trimmedQuote}</blockquote>`;
            }
            return match;
        }
    );

    return formatted;
};

const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "💩"];

const selectedCommentReactions = computed(() => {
    if (!props.comment.grouped_reactions) {
        return [];
    }
    return allowedEmojis.filter((emoji) => getCommentReactionCount(emoji) > 0);
});

const getCommentReactionCount = (emoji) => {
    if (
        !props.comment.grouped_reactions ||
        !props.comment.grouped_reactions[emoji]
    ) {
        return 0;
    }
    return props.comment.grouped_reactions[emoji].count || 0;
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
        return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
};
</script>
