<template>
    <div ref="timelineContainer" class="space-y-4">
        <MessageCTA v-if="!readOnly" @click="showMessageBuilderModal = true" />

        <div
            v-if="localMessages.length === 0 && !loading"
            class="text-center py-8 text-gray-500 dark:text-gray-400"
        >
            No messages yet. Be the first to post!
        </div>

        <div
            v-for="message in localMessages"
            :id="`message-${message.id}`"
            :key="message.id"
            :class="[
                'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 scroll-mt-4 relative',
                readOnly
                    ? 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors'
                    : '',
            ]"
            @click="readOnly ? navigateToMessage(message.id) : null"
        >
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar :user="message.user" size="sm" />
                    <Link
                        v-if="message.user?.email"
                        :href="route('users.show', message.user.email)"
                        class="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        {{ message.user.name }}
                    </Link>
                    <span
                        v-else
                        class="font-semibold text-gray-900 dark:text-gray-100"
                    >
                        {{ message.user?.name || "Unknown User" }}
                    </span>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                        {{ formatDate(message.created_at) }}
                    </span>
                </div>
                <div
                    v-if="!readOnly"
                    class="flex items-center flex-shrink-0 ml-2"
                >
                    <Dropdown align="right" width="48">
                        <template #trigger>
                            <button
                                type="button"
                                class="w-8 h-8 p-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                :title="t('message.actions')"
                                :aria-label="t('message.actions')"
                            >
                                <i class="ri-more-2-fill text-lg"></i>
                            </button>
                        </template>
                        <template #content>
                            <button
                                type="button"
                                :disabled="speaking"
                                class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                @click="speakMessage(message)"
                            >
                                <div class="flex items-center gap-2">
                                    <i class="ri-speak-fill"></i>
                                    <span>{{ t("message.speak") }}</span>
                                </div>
                            </button>
                            <button
                                v-if="canAdmin"
                                type="button"
                                class="block w-full px-4 py-2 text-left text-sm leading-5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none transition duration-150 ease-in-out"
                                @click="deleteMessage(message.id)"
                            >
                                <div class="flex items-center gap-2">
                                    <i class="ri-delete-bin-line"></i>
                                    <span>{{ t("message.delete") }}</span>
                                </div>
                            </button>
                        </template>
                    </Dropdown>
                </div>
            </div>

            <div class="w-full">
                <div
                    class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words text-lg leading-relaxed"
                    v-html="formatMessage(message.message)"
                ></div>
                <div
                    v-if="
                        message.page_id &&
                        message.page &&
                        (message.page.media_path ||
                            message.page.media_poster ||
                            message.page.video_link)
                    "
                    class="mt-2 md:mt-3"
                >
                    <div v-if="message.page.video_link" class="mt-2">
                        <Link
                            :href="route('pages.show', message.page_id)"
                            class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                            @click.stop
                        >
                            <i class="ri-play-circle-line text-base"></i>
                            <span>Watch video</span>
                        </Link>
                    </div>
                    <Link
                        v-if="!message.page.video_link"
                        :href="route('pages.show', message.page_id)"
                        class="block rounded-lg overflow-hidden w-full max-w-[200px] sm:max-w-[250px] mt-2"
                        @click.stop
                    >
                        <img
                            :src="getPageImageSrc(message.page)"
                            :alt="
                                message.page.content
                                    ? stripHtml(message.page.content).substring(
                                          0,
                                          50
                                      )
                                    : t('message.shared_page')
                            "
                            class="w-full h-auto max-h-[200px] sm:max-h-[250px] object-contain rounded-lg"
                            loading="lazy"
                        />
                    </Link>
                </div>
                <MessageReactions
                    v-if="!readOnly"
                    :grouped-reactions="message.grouped_reactions || {}"
                    :selected-reactions="getSelectedReactions(message)"
                    :current-user-id="currentUserId"
                    @toggle-reaction="(emoji) => toggleReaction(message, emoji)"
                    @add-reaction="openReactionModal(message)"
                    @view-reactions="openViewReactionsModal(message)"
                />
            </div>

            <div
                v-if="!readOnly"
                class="mt-4 border-t-2 border-gray-200 dark:border-gray-700 pt-4"
            >
                <!-- No comments: inviting CTA -->
                <div
                    v-if="getCommentCount(message) === 0 && !activeCommentForms[message.id]"
                    class="flex items-center gap-3 py-4 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer group hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
                    @click="openCommentForm(message.id)"
                >
                    <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                        <i class="ri-chat-3-line text-xl text-blue-500 dark:text-blue-400"></i>
                    </div>
                    <span class="text-sm font-medium text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {{ t("message.start_conversation") }}
                    </span>
                    <i class="ri-add-line text-lg text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 ml-auto transition-colors"></i>
                </div>

                <!-- Has comments or form is active -->
                <template v-else>
                    <!-- Preview comments (first 2) -->
                    <div v-if="getComments(message).length > 0" class="space-y-3">
                        <div class="flex items-center gap-1.5 mb-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            <i class="ri-chat-3-line text-sm"></i>
                            <span>
                                {{ getCommentCount(message) }}
                                {{ getCommentCount(message) === 1 ? t("message.comment") : t("message.comments") }}
                            </span>
                        </div>

                        <CommentItem
                            v-for="comment in getPreviewComments(message)"
                            :key="comment.id"
                            :comment="comment"
                            :speaking="speaking"
                            :current-user-id="currentUserId"
                            :users="users"
                            @speak="speakComment"
                            @delete="(commentId) => deleteComment(message.id, commentId)"
                            @toggle-reaction="(emoji) => toggleCommentReaction(message, comment, emoji)"
                            @add-reaction="openCommentReactionModal(message, comment)"
                            @reply="(comment) => handleReplyToComment(message, comment)"
                        />

                        <!-- Show more / show less -->
                        <button
                            v-if="getCommentCount(message) > 2 && !expandedComments[message.id]"
                            type="button"
                            class="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-1 pl-2"
                            @click="expandedComments[message.id] = true"
                        >
                            <i class="ri-arrow-down-s-line text-base"></i>
                            {{ t("message.show_more_comments", { count: getCommentCount(message) - 2 }) }}
                        </button>

                        <!-- Remaining comments when expanded -->
                        <template v-if="expandedComments[message.id] && getRemainingComments(message).length > 0">
                            <CommentItem
                                v-for="comment in getRemainingComments(message)"
                                :key="comment.id"
                                :comment="comment"
                                :speaking="speaking"
                                :current-user-id="currentUserId"
                                :users="users"
                                @speak="speakComment"
                                @delete="(commentId) => deleteComment(message.id, commentId)"
                                @toggle-reaction="(emoji) => toggleCommentReaction(message, comment, emoji)"
                                @add-reaction="openCommentReactionModal(message, comment)"
                                @reply="(comment) => handleReplyToComment(message, comment)"
                            />

                            <button
                                type="button"
                                class="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors py-1 pl-2"
                                @click="expandedComments[message.id] = false"
                            >
                                <i class="ri-arrow-up-s-line text-base"></i>
                                {{ t("message.show_less_comments") }}
                            </button>
                        </template>
                    </div>

                    <!-- Add comment button (when form is not active) -->
                    <button
                        v-if="!activeCommentForms[message.id]"
                        type="button"
                        class="flex items-center gap-2 mt-3 text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5"
                        @click="openCommentForm(message.id)"
                    >
                        <i class="ri-reply-line text-base"></i>
                        {{ t("message.add_comment") }}
                    </button>

                    <!-- Comment form -->
                    <form
                        v-if="activeCommentForms[message.id]"
                        class="space-y-2 mt-3"
                        @submit.prevent="submitComment(message)"
                    >
                        <div class="relative" style="z-index: 1;">
                            <textarea
                                :ref="
                                    (el) => {
                                        if (el) {
                                            if (!commentTextareaRefs.value) {
                                                commentTextareaRefs.value = {};
                                            }
                                            commentTextareaRefs.value[message.id] = el;
                                            const tagging = getCommentTagging(message.id);
                                            if (tagging && tagging.textareaRef) {
                                                tagging.textareaRef.value = el;
                                            }
                                        }
                                    }
                                "
                                v-model="commentForms[message.id]"
                                :placeholder="t('message.comment_placeholder')"
                                maxlength="1000"
                                rows="3"
                                class="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden min-h-[76px] max-h-[200px]"
                                @input="(e) => handleCommentInput(e, message.id)"
                                @keydown="(e) => handleCommentKeydown(e, message.id)"
                                @blur="(e) => handleCommentBlur(e, message.id)"
                            ></textarea>
                            <button
                                type="button"
                                class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                :title="t('builder.tag_user')"
                                :aria-label="t('builder.tag_user_aria')"
                                @click.prevent="openCommentTagList(message.id)"
                            >
                                @
                            </button>

                            <div
                                v-if="getCommentTagging(message.id).showUserSuggestions"
                                class="user-suggestions-container absolute top-full left-0 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto"
                                style="pointer-events: auto;"
                                @click.stop
                                @mousedown.stop
                            >
                                <UserTagList
                                    :users="getCommentTagging(message.id).userSuggestions"
                                    :selected-index="getCommentTagging(message.id).selectedSuggestionIndex"
                                    @select="
                                        (user) => {
                                            if (user) {
                                                insertCommentMention(message.id, user);
                                            }
                                        }
                                    "
                                />
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                {{ (commentForms[message.id] || "").length }}/1000
                            </span>
                            <Button
                                type="submit"
                                :disabled="!commentForms[message.id]?.trim()"
                            >
                                {{ t("message.post_comment") }}
                            </Button>
                        </div>
                    </form>
                </template>
            </div>
        </div>

        <div v-if="loading" class="text-center py-4 text-gray-500">
            {{ t("message.loading") }}
        </div>

        <div ref="infiniteScrollRef" class="h-4"></div>

        <ScrollTop :custom-scroll-handler="scrollToTimeline" />

        <Modal
            :show="showReactionModal"
            max-width="sm"
            @close="closeReactionModal"
        >
            <div class="p-6">
                <h2
                    class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4"
                >
                    Add Reaction
                </h2>
                <div class="grid grid-cols-5 gap-3">
                    <button
                        v-for="emoji in allowedEmojis"
                        :key="emoji"
                        type="button"
                        :class="[
                            'flex items-center justify-center p-3 rounded-lg text-2xl transition-colors',
                            selectedMessageForReaction &&
                            hasUserReacted(selectedMessageForReaction, emoji)
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                        ]"
                        :title="emoji"
                        @click="selectReaction(emoji)"
                    >
                        {{ emoji }}
                    </button>
                </div>
            </div>
        </Modal>

        <Modal
            :show="showViewReactionsModal"
            max-width="sm"
            @close="closeViewReactionsModal"
        >
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2
                        class="text-lg font-medium text-gray-900 dark:text-gray-100"
                    >
                        {{ t("general.reactions") }}
                    </h2>
                    <Button
                        v-if="selectedMessageForView"
                        type="button"
                        :disabled="speaking"
                        :title="t('general.speak_all_reactions')"
                        :aria-label="t('general.speak_all_reactions_aria')"
                        @click="speakAllReactions(selectedMessageForView)"
                    >
                        <i class="ri-speak-fill text-xl"></i>
                    </Button>
                </div>
                <div v-if="selectedMessageForView" class="space-y-4">
                    <div
                        v-for="emoji in getSelectedReactions(
                            selectedMessageForView
                        )"
                        :key="emoji"
                        class="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
                    >
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-2xl">{{ emoji }}</span>
                            <span
                                class="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                {{
                                    getReactionCount(
                                        selectedMessageForView,
                                        emoji
                                    )
                                }}
                                {{
                                    getReactionCount(
                                        selectedMessageForView,
                                        emoji
                                    ) === 1
                                        ? t("message.reaction")
                                        : t("message.reactions")
                                }}
                            </span>
                        </div>
                        <div class="space-y-1 ml-8">
                            <div
                                v-for="user in getReactionUsers(
                                    selectedMessageForView,
                                    emoji
                                )"
                                :key="user.id"
                                class="text-sm text-gray-600 dark:text-gray-400"
                            >
                                {{ user.name }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>

        <Modal
            :show="showCommentReactionModal"
            max-width="sm"
            @close="closeCommentReactionModal"
        >
            <div class="p-6">
                <h2
                    class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4"
                >
                    Add Reaction
                </h2>
                <div class="grid grid-cols-5 gap-3">
                    <button
                        v-for="emoji in allowedEmojis"
                        :key="emoji"
                        type="button"
                        :class="[
                            'flex items-center justify-center p-3 rounded-lg text-2xl transition-colors',
                            selectedCommentForReaction &&
                            hasUserReactedToComment(
                                selectedCommentForReaction,
                                emoji
                            )
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                        ]"
                        :title="emoji"
                        @click="selectCommentReaction(emoji)"
                    >
                        {{ emoji }}
                    </button>
                </div>
            </div>
        </Modal>

        <MessageBuilderModal
            :show="showMessageBuilderModal"
            :users="users"
            @close="showMessageBuilderModal = false"
            @message-posted="handleMessagePosted"
        />
    </div>
</template>

<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import Button from "@/Components/Button.vue";
import Dropdown from "@/Components/Dropdown.vue";
import CommentItem from "@/Components/Messages/CommentItem.vue";
import MessageBuilderModal from "@/Components/Messages/MessageBuilderModal.vue";
import MessageCTA from "@/Components/Messages/MessageCTA.vue";
import MessageReactions from "@/Components/Messages/MessageReactions.vue";
import UserTagList from "@/Components/UserTagList.vue";
import Modal from "@/Components/Modal.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import { usePermissions } from "@/composables/permissions";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useMessageBuilder } from "@/composables/useMessageBuilder";
import { useMessageLocator } from "@/composables/useMessageLocator";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useUserTagging } from "@/composables/useUserTagging";
import { useMedia } from "@/mediaHelpers";
import { Link, router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
    messages: {
        type: [Object, Array],
        default: () => ({ data: [] }),
    },
    users: {
        type: Array,
        default: () => [],
    },
    readOnly: {
        type: Boolean,
        default: false,
    },
});

const { canAdmin } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();
const { setFlashMessage } = useFlashMessage();
const { t } = useTranslations();
const { isVideo } = useMedia();
const { setActiveMessageInput } = useMessageBuilder();
const loading = ref(false);
const messagesChannel = ref(null);
const showReactionModal = ref(false);
const selectedMessageForReaction = ref(null);
const showViewReactionsModal = ref(false);
const selectedMessageForView = ref(null);
const timelineContainer = ref(null);
const expandedComments = ref({});
const activeCommentForms = ref({});
const commentForms = ref({});
const commentTextareaRefs = ref({});
const commentTaggingInstances = ref({});
const commentTaggingWatchers = ref({});
const showCommentReactionModal = ref(false);
const selectedCommentForReaction = ref(null);
const selectedMessageForCommentReaction = ref(null);
const showMessageBuilderModal = ref(false);

const messagesData = computed(() => {
    if (Array.isArray(props.messages)) {
        return props.messages;
    }
    return props.messages?.data || [];
});

const messagesPagination = computed(() => {
    if (Array.isArray(props.messages)) {
        return {
            data: props.messages,
            next_page_url: null,
        };
    }
    return props.messages || { data: [], next_page_url: null };
});

const {
    items: infiniteScrollItems,
    infiniteScrollRef,
    pause: pauseInfiniteScroll,
    resume: resumeInfiniteScroll,
} = useInfiniteScroll(messagesData.value, messagesPagination);

const normalizeMessage = (message) => ({
    ...message,
    grouped_reactions: message.grouped_reactions || {},
    comments: (message.comments || []).map((comment) => ({
        ...comment,
        grouped_reactions: comment.grouped_reactions || {},
    })),
});

const initializeMessages = (messageArray) =>
    messageArray.map((message) => normalizeMessage(message));

const localMessages = ref(initializeMessages(messagesData.value));

const {
    saveScrollPosition,
    restoreScrollPosition,
    createScrollState,
} = useMessageLocator({
    messages: localMessages,
    normalizeMessage,
    pauseInfiniteScroll,
    resumeInfiniteScroll,
});

const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "💩"];

const currentUserId = computed(() => {
    return usePage().props.auth?.user?.id;
});

const handleMessagePosted = () => {
    showMessageBuilderModal.value = false;
    setTimeout(() => {
        scrollToTimeline();
    }, 300);
};

watch(
    () => infiniteScrollItems.value,
    (newItems) => {
        const state = createScrollState();
        saveScrollPosition(state);

        const newItemsIds = new Set(newItems.map((m) => m.id));
        const echoMessages = localMessages.value.filter(
            (m) => !newItemsIds.has(m.id)
        );
        const allMessages = [...newItems, ...echoMessages];

        localMessages.value = allMessages.map(normalizeMessage).sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB - dateA;
        });

        restoreScrollPosition(state);
    },
    { deep: true, immediate: true }
);

watch(
    () => messagesData.value,
    (newMessages) => {
        const state = createScrollState();
        saveScrollPosition(state);

        const propsIds = new Set(newMessages.map((m) => m.id));

        const existingMessagesToKeep = localMessages.value.filter(
            (m) => !propsIds.has(m.id)
        );

        const allMessages = [...newMessages, ...existingMessagesToKeep];
        localMessages.value = allMessages.map(normalizeMessage).sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB - dateA;
        });

        restoreScrollPosition(state);
    },
    { immediate: false }
);

const getPageImageSrc = (page) => {
    const isVideoPage =
        page.video_link || (page.media_path && isVideo(page.media_path));

    if (isVideoPage) {
        return page.media_poster || "/img/video-placeholder.png";
    }

    return page.media_path;
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

const formatMessage = (text) => {
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

const stripHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

const speakMessage = (message) => {
    const messageText = stripHtml(formatMessage(message.message));
    const username = message.user?.name || "Someone";
    speak(`${username} says ${messageText}`);
};

const speakAllReactions = (message) => {
    if (!message || !message.grouped_reactions) {
        return;
    }

    const emojiNames = {
        "👍": "thumbs up",
        "❤️": "heart",
        "😂": "laughing",
        "😮": "surprised",
        "😢": "sad",
        "💩": "poop",
    };

    const selectedReactions = getSelectedReactions(message);

    if (selectedReactions.length === 0) {
        speak("No reactions");
        return;
    }

    const reactionTexts = selectedReactions
        .map((emoji) => {
            const users = getReactionUsers(message, emoji);
            const emojiName = emojiNames[emoji] || "reaction";

            if (users.length === 0) {
                return "";
            }

            const userNames = users.map((u) => u.name).join(", ");
            const lastCommaIndex = userNames.lastIndexOf(", ");

            let formattedNames;
            if (lastCommaIndex !== -1) {
                formattedNames =
                    userNames.substring(0, lastCommaIndex) +
                    ", and " +
                    userNames.substring(lastCommaIndex + 2);
            } else {
                formattedNames = userNames;
            }

            return `${emojiName} from ${formattedNames}`;
        })
        .filter((text) => text !== "");

    const fullText = reactionTexts.join(". ") + ".";
    speak(fullText);
};

const deleteMessage = (messageId) => {
    if (!confirm("Are you sure you want to delete this message?")) {
        return;
    }

    delete commentForms.value[messageId];
    delete activeCommentForms.value[messageId];
    expandedComments.value[messageId] = false;

    router.delete(route("messages.destroy", messageId), {
        preserveScroll: true,
        onSuccess: () => {
            localMessages.value = localMessages.value.filter(
                (m) => m.id !== messageId
            );
            setActiveMessageInput();
        },
    });
};

const navigateToMessage = (messageId) => {
    // Construct URL exactly like notifications do
    let url = route("messages.index");
    if (messageId) {
        url = `${url}#message-${messageId}`;
    }
    router.visit(url);
};

const setupEchoListener = () => {
    if (!window.Echo) {
        setTimeout(setupEchoListener, 500);
        return;
    }

    if (messagesChannel.value) {
        return;
    }

    try {
        messagesChannel.value = window.Echo.private("messages");

        if (messagesChannel.value.error) {
            messagesChannel.value.error((error) => {
                console.error("Error subscribing to messages channel:", error);
            });
        }

        messagesChannel.value.listen(".MessageCreated", (event) => {
            handleMessageEvent(event);
        });

        messagesChannel.value.listen(".MessageReactionUpdated", (event) => {
            handleReactionUpdate(event);
        });

        messagesChannel.value.listen(".CommentCreated", (event) => {
            handleCommentEvent(event);
        });

        messagesChannel.value.listen(".CommentReactionUpdated", (event) => {
            handleCommentReactionUpdate(event);
        });
    } catch (error) {
        console.error("Error setting up Echo listener:", error);
    }
};

const handleMessageEvent = (event) => {
    const messageData = event;

    if (!messageData || !messageData.id || !messageData.user) {
        return;
    }

    const messageExists = localMessages.value.some(
        (m) => m.id === messageData.id
    );

    if (!messageExists) {
        if (!messageData.grouped_reactions) {
            messageData.grouped_reactions = {};
        }
        if (!messageData.comments) {
            messageData.comments = [];
        }
        localMessages.value.push(messageData);
        localMessages.value.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB - dateA;
        });

        const successMessage =
            event.success_message || messageData.success_message;
        if (successMessage) {
            setFlashMessage("info", successMessage, 5000);
        } else if (messageData.user?.name) {
            const fallbackMessage = `New message added by ${messageData.user.name}`;
            setFlashMessage("info", fallbackMessage, 5000);
        }

        if (messageData.user_id === currentUserId.value) {
            nextTick(() => {
                scrollToTimeline();
            });
        }
    }
};

const handleReactionUpdate = (event) => {
    const messageId = event.message_id;
    const groupedReactions = event.grouped_reactions || {};

    const messageIndex = localMessages.value.findIndex(
        (m) => m.id === messageId
    );
    if (messageIndex !== -1) {
        localMessages.value[messageIndex].grouped_reactions = groupedReactions;
    }
};

const cleanup = () => {
    if (messagesChannel.value && window.Echo) {
        try {
            window.Echo.leave("messages");
        } catch (error) {
            // Ignore errors when leaving channel
        }
        messagesChannel.value = null;
    }
};

const scrollToTimeline = () => {
    if (timelineContainer.value) {
        timelineContainer.value.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }
};

onMounted(() => {
    setupEchoListener();

    nextTick(() => {
        Object.keys(activeCommentForms.value).forEach((messageId) => {
            if (
                activeCommentForms.value[messageId] &&
                commentTextareaRefs.value[messageId]
            ) {
                autoGrowCommentTextarea(messageId);
            }
        });
    });
});

onUnmounted(() => {
    cleanup();

    Object.keys(commentTaggingWatchers.value).forEach((messageId) => {
        cleanupCommentTagging(messageId);
    });
});

const getSelectedReactions = (message) => {
    if (!message.grouped_reactions) {
        return [];
    }
    return allowedEmojis.filter(
        (emoji) => getReactionCount(message, emoji) > 0
    );
};

const getReactionCount = (message, emoji) => {
    if (!message.grouped_reactions || !message.grouped_reactions[emoji]) {
        return 0;
    }
    return message.grouped_reactions[emoji].count || 0;
};

const getReactionUsers = (message, emoji) => {
    if (!message.grouped_reactions || !message.grouped_reactions[emoji]) {
        return [];
    }
    return message.grouped_reactions[emoji].users || [];
};

const hasUserReacted = (message, emoji) => {
    if (!currentUserId.value) return false;
    const users = getReactionUsers(message, emoji);
    return users.some((user) => user.id === currentUserId.value);
};

const openViewReactionsModal = (message) => {
    selectedMessageForView.value = message;
    showViewReactionsModal.value = true;
};

const closeViewReactionsModal = () => {
    showViewReactionsModal.value = false;
    selectedMessageForView.value = null;
};

const openReactionModal = (message) => {
    selectedMessageForReaction.value = message;
    showReactionModal.value = true;
};

const closeReactionModal = () => {
    showReactionModal.value = false;
    selectedMessageForReaction.value = null;
};

const selectReaction = async (emoji) => {
    if (!currentUserId.value || !selectedMessageForReaction.value) return;

    const message = selectedMessageForReaction.value;
    const currentlyReacted = hasUserReacted(message, emoji);

    // Initialize grouped_reactions if not present
    if (!message.grouped_reactions) {
        message.grouped_reactions = {};
    }

    try {
        let response;
        if (currentlyReacted) {
            // Remove reaction
            response = await axios.delete(
                route("messages.reactions.destroy", message.id)
            );
        } else {
            // Add or update reaction
            response = await axios.post(
                route("messages.reactions.store", message.id),
                {
                    emoji: emoji,
                }
            );
        }

        // Update local state with server response
        if (response?.data?.grouped_reactions) {
            message.grouped_reactions = response.data.grouped_reactions;
        }

        closeReactionModal();
    } catch (error) {
        console.error("Error toggling reaction:", error);
        setFlashMessage(
            "error",
            "Failed to update reaction. Please try again.",
            3000
        );
    }
};

const toggleReaction = async (message, emoji) => {
    if (!currentUserId.value) return;

    const currentlyReacted = hasUserReacted(message, emoji);

    // Initialize grouped_reactions if not present
    if (!message.grouped_reactions) {
        message.grouped_reactions = {};
    }

    try {
        let response;
        if (currentlyReacted) {
            // Remove reaction
            response = await axios.delete(
                route("messages.reactions.destroy", message.id)
            );
        } else {
            // Add or update reaction
            response = await axios.post(
                route("messages.reactions.store", message.id),
                {
                    emoji: emoji,
                }
            );
        }

        // Update local state with server response
        if (response?.data?.grouped_reactions) {
            message.grouped_reactions = response.data.grouped_reactions;
        }
    } catch (error) {
        console.error("Error toggling reaction:", error);
        setFlashMessage(
            "error",
            "Failed to update reaction. Please try again.",
            3000
        );
    }
};

function autoGrowCommentTextarea(messageId) {
    const textarea = commentTextareaRefs.value[messageId];
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
}

function getCommentTagging(messageId) {
    if (!commentTaggingInstances.value[messageId]) {
        const textareaRef = ref(null);
        const inputValue = ref(commentForms.value[messageId] || "");
        const users = ref(props.users || []);

        const stopWatch1 = watch(
            () => commentForms.value[messageId],
            (newValue) => {
                if (inputValue.value !== (newValue || "")) {
                    inputValue.value = newValue || "";
                }
            }
        );

        const stopWatch2 = watch(inputValue, (newValue) => {
            if (commentForms.value[messageId] !== newValue) {
                commentForms.value[messageId] = newValue;
            }
        });

        const stopWatch3 = watch(
            () => commentTextareaRefs.value[messageId],
            (newRef) => {
                if (newRef) {
                    textareaRef.value = newRef;
                }
            },
            { immediate: true }
        );

        commentTaggingWatchers.value[messageId] = [
            stopWatch1,
            stopWatch2,
            stopWatch3,
        ];

        const tagging = useUserTagging({
            users,
            textareaRef,
            inputValue,
        });

        commentTaggingInstances.value[messageId] = tagging;
    }
    return commentTaggingInstances.value[messageId];
}

function cleanupCommentTagging(messageId) {
    if (commentTaggingWatchers.value[messageId]) {
        commentTaggingWatchers.value[messageId].forEach((stop) => stop());
        delete commentTaggingWatchers.value[messageId];
    }

    if (commentTaggingInstances.value[messageId]) {
        commentTaggingInstances.value[messageId].clearMentions();
        delete commentTaggingInstances.value[messageId];
    }

    if (commentTextareaRefs.value[messageId]) {
        delete commentTextareaRefs.value[messageId];
    }
}

function insertCommentMention(messageId, user) {
    if (!user) return;
    
    const tagging = getCommentTagging(messageId);
    if (!tagging) return;
    
    let textarea = commentTextareaRefs.value?.[messageId];
    
    if (!textarea) {
        const messageElement = document.querySelector(`#message-${messageId}`);
        if (messageElement) {
            textarea = messageElement.querySelector('textarea');
            if (textarea && commentTextareaRefs.value) {
                commentTextareaRefs.value[messageId] = textarea;
            }
        }
    }
    
    if (!textarea) return;
    
    const userId = user.id ?? user.user_id ?? user.ID;
    const userName = user.name ?? user.user_name ?? user.Name;
    
    if (!userName) return;
    
    const currentValue = textarea.value || commentForms.value[messageId] || "";
    const cursorPos = textarea.selectionStart ?? currentValue.length;
    const textBeforeCursor = currentValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex === -1) {
        return;
    }
    
    const beforeMention = currentValue.substring(0, lastAtIndex);
    const mentionText = `@${userName}`;
    const textAfterAt = currentValue.substring(lastAtIndex);
    const afterMention = textAfterAt.replace(/@[\w\s]*/, `${mentionText} `);
    const newValue = beforeMention + afterMention;
    
    commentForms.value[messageId] = newValue;
    
    if (tagging.inputValue) {
        tagging.inputValue.value = newValue;
    }
    
    nextTick(() => {
        if (textarea) {
            if (textarea.value !== newValue) {
                textarea.value = newValue;
            }
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                "value"
            )?.set;
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(textarea, newValue);
            }
            const event = new Event("input", { bubbles: true });
            textarea.dispatchEvent(event);
        }
    });
    
    if (userId !== undefined && userId !== null && tagging.mentionUserIds && tagging.mentionUserIds.value) {
        const parsedUserId = parseInt(userId, 10);
        if (!isNaN(parsedUserId)) {
            tagging.mentionUserIds.value.set(mentionText, parsedUserId);
        }
    }
    
    if (tagging.showUserSuggestions) {
        if (typeof tagging.showUserSuggestions === 'object' && 'value' in tagging.showUserSuggestions) {
            tagging.showUserSuggestions.value = false;
        }
    }
    if (tagging.mentionQuery) {
        if (typeof tagging.mentionQuery === 'object' && 'value' in tagging.mentionQuery) {
            tagging.mentionQuery.value = "";
        }
    }
    if (tagging.mentionStartPos) {
        if (typeof tagging.mentionStartPos === 'object' && 'value' in tagging.mentionStartPos) {
            tagging.mentionStartPos.value = -1;
        }
    }
    
    autoGrowCommentTextarea(messageId);
    
    setTimeout(() => {
        if (textarea) {
            const newCursorPos = beforeMention.length + mentionText.length + 1;
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, 10);
}

function handleCommentInput(event, messageId) {
    const value = event.target.value;
    commentForms.value[messageId] = value;

    const tagging = getCommentTagging(messageId);
    const cursorPos = event.target.selectionStart ?? value.length;
    tagging.checkForMentions(value, cursorPos);

    autoGrowCommentTextarea(messageId);
}

function handleCommentKeydown(event, messageId) {
    const tagging = getCommentTagging(messageId);
    tagging.handleKeydown(event);

    if (event.key === "Enter" && tagging.selectedSuggestionIndex.value >= 0) {
        nextTick(() => {
            autoGrowCommentTextarea(messageId);
        });
    }
}

function handleCommentBlur(event, messageId) {
    const relatedTarget = event.relatedTarget;
    const tagging = getCommentTagging(messageId);
    
    if (!tagging) return;
    
    if (relatedTarget?.closest(".user-suggestions-container")) {
        setTimeout(() => {
            const textarea = commentTextareaRefs.value?.[messageId];
            if (textarea) {
                textarea.focus();
            }
        }, 0);
        return;
    }
    
    setTimeout(() => {
        if (!tagging || !tagging.showUserSuggestions) return;
        
        const activeElement = document.activeElement;
        const isClickingInSuggestions = activeElement?.closest(".user-suggestions-container");
        if (!isClickingInSuggestions && 
            activeElement !== commentTextareaRefs.value?.[messageId]) {
            if (tagging.showUserSuggestions.value !== undefined) {
                tagging.showUserSuggestions.value = false;
            }
        }
    }, 200);
}

function openCommentTagList(messageId) {
    if (!commentForms.value[messageId]) {
        commentForms.value[messageId] = "";
    }
    const textarea = commentTextareaRefs.value[messageId];
    const tagging = getCommentTagging(messageId);
    const currentValue = commentForms.value[messageId] || "";
    const cursorPos = textarea?.selectionStart ?? currentValue.length;
    const newValue =
        currentValue.slice(0, cursorPos) + "@" + currentValue.slice(cursorPos);

    commentForms.value[messageId] = newValue;
    if (textarea) {
        textarea.value = newValue;
        textarea.focus();
        textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
    }
    tagging.checkForMentions(newValue, cursorPos + 1);
    autoGrowCommentTextarea(messageId);
}

const getComments = (message) => {
    if (!message.comments) {
        return [];
    }
    return [...message.comments].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateA - dateB;
    });
};

const getPreviewComments = (message) => {
    return getComments(message).slice(0, 2);
};

const getRemainingComments = (message) => {
    return getComments(message).slice(2);
};

const getCommentCount = (message) => {
    return message.comments?.length || 0;
};

const openCommentForm = (messageId) => {
    activeCommentForms.value[messageId] = true;
    if (!commentForms.value[messageId]) {
        commentForms.value[messageId] = "";
    }
    getCommentTagging(messageId);
    nextTick(() => {
        if (commentTextareaRefs.value[messageId]) {
            commentTextareaRefs.value[messageId].focus();
        }
    });
};

const submitComment = async (message) => {
    const commentText = commentForms.value[message.id]?.trim();
    if (!commentText) {
        return;
    }

    const tagging = getCommentTagging(message.id);
    const taggedUserIds = tagging.getTaggedUserIds(commentText);

    const commentTextToSubmit = commentText;
    commentForms.value[message.id] = "";

    tagging.clearMentions();

    try {
        await router.post(
            route("messages.comments.store", message.id),
            {
                comment: commentTextToSubmit,
                tagged_user_ids: taggedUserIds,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (commentTextareaRefs.value[message.id]) {
                        commentTextareaRefs.value[message.id].style.height =
                            "auto";
                    }
                },
                onError: () => {
                    commentForms.value[message.id] = commentTextToSubmit;
                },
            }
        );
    } catch (error) {
        commentForms.value[message.id] = commentTextToSubmit;
        setFlashMessage(
            "error",
            "Failed to post comment. Please try again.",
            3000
        );
    }
};

const speakComment = (comment) => {
    const commentText = comment.comment || "";
    const username = comment.user?.name || "Someone";
    speak(`${username} says ${commentText}`);
};

const extractActualCommentText = (commentText) => {
    if (!commentText) return "";

    const blockquotePattern1 = /@[^\n]+\n>\s*[^\n]*(?:\n\n|\n)(.*)/s;
    const blockquotePattern2 = /@[^\s>]+\s*>\s*[^\n]*(?:\n\n|\n)(.*)/s;

    let match = commentText.match(blockquotePattern1);
    if (!match) {
        match = commentText.match(blockquotePattern2);
    }

    if (match && match[1]) {
        return match[1].trim();
    }

    return commentText.trim();
};

const handleReplyToComment = (message, comment) => {
    const formWasHidden = !activeCommentForms.value[message.id];

    if (formWasHidden) {
        openCommentForm(message.id);
    }

    const username = comment.user?.name || "";
    const actualCommentText = extractActualCommentText(comment.comment || "");
    const replyText = `@${username}\n>${actualCommentText}\n\n`;

    if (!commentForms.value[message.id]) {
        commentForms.value[message.id] = "";
    }

    commentForms.value[message.id] = replyText;

    const scrollToTextarea = () => {
        let textarea = commentTextareaRefs.value[message.id];

        if (!textarea) {
            const messageElement = document.getElementById(
                `message-${message.id}`
            );
            if (messageElement) {
                textarea = messageElement.querySelector("textarea");
            }
        }

        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(replyText.length, replyText.length);
            autoGrowCommentTextarea(message.id);

            setTimeout(() => {
                const rect = textarea.getBoundingClientRect();
                const absoluteElementTop = rect.top + window.pageYOffset;
                const middle =
                    absoluteElementTop -
                    window.innerHeight / 2 +
                    rect.height / 2;

                window.scrollTo({
                    top: middle,
                    behavior: "smooth",
                });
            }, 100);
            return true;
        }
        return false;
    };

    if (formWasHidden) {
        nextTick(() => {
            let attempts = 0;
            const maxAttempts = 20;
            const tryScroll = () => {
                const success = scrollToTextarea();
                if (!success && attempts < maxAttempts) {
                    attempts++;
                    setTimeout(tryScroll, 50);
                }
            };
            tryScroll();
        });
    } else {
        nextTick(() => {
            scrollToTextarea();
        });
    }
};

const deleteComment = (messageId, commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
        return;
    }

    router.delete(route("messages.comments.destroy", [messageId, commentId]), {
        preserveScroll: true,
        onSuccess: () => {
            const message = localMessages.value.find((m) => m.id === messageId);
            if (message && message.comments) {
                message.comments = message.comments.filter(
                    (c) => c.id !== commentId
                );
            }
        },
    });
};

const getCommentReactionUsers = (comment, emoji) => {
    if (!comment.grouped_reactions || !comment.grouped_reactions[emoji]) {
        return [];
    }
    return comment.grouped_reactions[emoji].users || [];
};

const hasUserReactedToComment = (comment, emoji) => {
    if (!currentUserId.value) return false;
    const users = getCommentReactionUsers(comment, emoji);
    return users.some((user) => user.id === currentUserId.value);
};

const openCommentReactionModal = (message, comment) => {
    selectedCommentForReaction.value = comment;
    selectedMessageForCommentReaction.value = message;
    showCommentReactionModal.value = true;
};

const closeCommentReactionModal = () => {
    showCommentReactionModal.value = false;
    selectedCommentForReaction.value = null;
    selectedMessageForCommentReaction.value = null;
};

const selectCommentReaction = async (emoji) => {
    if (
        !currentUserId.value ||
        !selectedCommentForReaction.value ||
        !selectedMessageForCommentReaction.value
    )
        return;

    const comment = selectedCommentForReaction.value;
    const message = selectedMessageForCommentReaction.value;
    const currentlyReacted = hasUserReactedToComment(comment, emoji);

    if (!comment.grouped_reactions) {
        comment.grouped_reactions = {};
    }

    try {
        let response;
        if (currentlyReacted) {
            response = await axios.delete(
                route("messages.comments.reactions.destroy", [
                    message.id,
                    comment.id,
                ])
            );
        } else {
            response = await axios.post(
                route("messages.comments.reactions.store", [
                    message.id,
                    comment.id,
                ]),
                {
                    emoji: emoji,
                }
            );
        }

        if (response?.data?.grouped_reactions) {
            comment.grouped_reactions = response.data.grouped_reactions;
        }

        closeCommentReactionModal();
    } catch (error) {
        setFlashMessage(
            "error",
            "Failed to update reaction. Please try again.",
            3000
        );
    }
};

const toggleCommentReaction = async (message, comment, emoji) => {
    if (!currentUserId.value) return;

    const currentlyReacted = hasUserReactedToComment(comment, emoji);

    if (!comment.grouped_reactions) {
        comment.grouped_reactions = {};
    }

    try {
        let response;
        if (currentlyReacted) {
            response = await axios.delete(
                route("messages.comments.reactions.destroy", [
                    message.id,
                    comment.id,
                ])
            );
        } else {
            response = await axios.post(
                route("messages.comments.reactions.store", [
                    message.id,
                    comment.id,
                ]),
                {
                    emoji: emoji,
                }
            );
        }

        if (response?.data?.grouped_reactions) {
            comment.grouped_reactions = response.data.grouped_reactions;
        }
    } catch (error) {
        setFlashMessage(
            "error",
            "Failed to update reaction. Please try again.",
            3000
        );
    }
};

const handleCommentEvent = (event) => {
    const commentData = event;
    const messageId = commentData.message_id;

    if (!commentData || !commentData.id || !commentData.user || !messageId) {
        return;
    }

    const messageIndex = localMessages.value.findIndex(
        (m) => m.id === messageId
    );
    if (messageIndex === -1) {
        return;
    }

    const message = { ...localMessages.value[messageIndex] };

    if (!message.comments) {
        message.comments = [];
    }

    const commentExists = message.comments.some((c) => c.id === commentData.id);
    if (!commentExists) {
        const processedComment = {
            ...commentData,
            grouped_reactions: commentData.grouped_reactions || {},
        };
        message.comments = [...message.comments, processedComment];
        localMessages.value[messageIndex] = message;
    }
};

const handleCommentReactionUpdate = (event) => {
    const commentId = event.comment_id;
    const messageId = event.message_id;
    const groupedReactions = event.grouped_reactions || {};

    const messageIndex = localMessages.value.findIndex(
        (m) => m.id === messageId
    );
    if (messageIndex === -1) {
        return;
    }

    const message = { ...localMessages.value[messageIndex] };
    if (!message.comments) {
        return;
    }

    const commentIndex = message.comments.findIndex((c) => c.id === commentId);
    if (commentIndex !== -1) {
        message.comments = message.comments.map((comment, idx) => {
            if (idx === commentIndex) {
                return { ...comment, grouped_reactions: groupedReactions };
            }
            return comment;
        });
        localMessages.value[messageIndex] = message;
    }
};
</script>
