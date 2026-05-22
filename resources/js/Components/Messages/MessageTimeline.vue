<template>
  <div ref="timelineContainer" class="space-y-4">
    <MessageCTA v-if="!readOnly" @click="openMessageBuilderModal" />

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
          : ''
      ]"
      @click="readOnly ? handleMessageRowClick($event, message.id) : null"
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
          <span v-else class="font-semibold text-gray-900 dark:text-gray-100">
            {{ message.user?.name || "Unknown User" }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(message.created_at) }}
          </span>
        </div>
        <div v-if="!readOnly" class="flex items-center flex-shrink-0 ml-2">
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
                  ? stripHtml(message.page.content).substring(0, 50)
                  : t('message.shared_page')
              "
              class="w-full h-auto max-h-[200px] sm:max-h-[250px] object-contain rounded-lg"
              loading="lazy"
            />
          </Link>
        </div>
        <div v-if="message.song_id && message.song" class="mt-2 md:mt-3">
          <button
            type="button"
            class="block rounded-lg overflow-hidden w-full max-w-[200px] sm:max-w-[250px] mt-2"
            @click.stop="playSharedSong(message.song)"
          >
            <img
              :src="getSongThumbnailSrc(message.song)"
              :alt="message.song.title || t('message.shared_song')"
              class="w-full h-auto max-h-[200px] sm:max-h-[250px] object-cover rounded-lg"
              loading="lazy"
            />
          </button>
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
          v-if="
            getCommentCount(message) === 0 && !isCommentModalOpenFor(message.id)
          "
          class="flex items-center gap-3 py-4 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer group hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
          @click="openCommentForm(message.id)"
        >
          <div
            class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors"
          >
            <i
              class="ri-chat-3-line text-xl text-blue-500 dark:text-blue-400"
            ></i>
          </div>
          <span
            class="text-sm font-medium text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          >
            {{ t("message.start_conversation") }}
          </span>
          <i
            class="ri-add-line text-lg text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 ml-auto transition-colors"
          ></i>
        </div>

        <!-- Has comments or form is active -->
        <template v-else>
          <!-- Preview comments (first 2) -->
          <div v-if="getComments(message).length > 0" class="space-y-3">
            <div
              class="flex items-center gap-1.5 mb-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              <i class="ri-chat-3-line text-sm"></i>
              <span>
                {{ getCommentCount(message) }}
                {{
                  getCommentCount(message) === 1
                    ? t("message.comment")
                    : t("message.comments")
                }}
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
              @toggle-reaction="
                (emoji) => toggleCommentReaction(message, comment, emoji)
              "
              @add-reaction="openCommentReactionModal(message, comment)"
              @view-reactions="openViewCommentReactionsModal(comment)"
            />

            <!-- Show more / show less -->
            <button
              v-if="
                getCommentCount(message) > 2 && !expandedComments[message.id]
              "
              type="button"
              class="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-1 pl-2"
              @click="expandedComments[message.id] = true"
            >
              <i class="ri-arrow-down-s-line text-base"></i>
              {{
                t("message.show_more_comments", {
                  count: getCommentCount(message) - 2
                })
              }}
            </button>

            <!-- Remaining comments when expanded -->
            <template
              v-if="
                expandedComments[message.id] &&
                getRemainingComments(message).length > 0
              "
            >
              <CommentItem
                v-for="comment in getRemainingComments(message)"
                :key="comment.id"
                :comment="comment"
                :speaking="speaking"
                :current-user-id="currentUserId"
                :users="users"
                @speak="speakComment"
                @delete="(commentId) => deleteComment(message.id, commentId)"
                @toggle-reaction="
                  (emoji) => toggleCommentReaction(message, comment, emoji)
                "
                @add-reaction="openCommentReactionModal(message, comment)"
                @view-reactions="openViewCommentReactionsModal(comment)"
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
            type="button"
            class="flex items-center gap-2 mt-3 text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5"
            @click="openCommentForm(message.id)"
          >
            <i class="ri-reply-line text-base"></i>
            {{ t("message.add_comment") }}
          </button>
        </template>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4 text-gray-500">
      {{ t("message.loading") }}
    </div>

    <div ref="infiniteScrollRef" class="h-4"></div>

    <ScrollTop :custom-scroll-handler="scrollToTimeline" />

    <Modal :show="showReactionModal" max-width="sm" @close="closeReactionModal">
      <div class="p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
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
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            ]"
            :title="emoji"
            @click="selectReaction(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </Modal>

    <ViewReactionsModal
      :show="showViewReactionsModal"
      :grouped-reactions="viewReactionsGrouped"
      :speaking="speaking"
      @close="closeViewReactionsModal"
      @speak-all="speakViewReactions"
    />

    <Modal
      :show="showCommentReactionModal"
      max-width="sm"
      @close="closeCommentReactionModal"
    >
      <div class="p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
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
              hasUserReactedToComment(selectedCommentForReaction, emoji)
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
      :show="showBuilderModal"
      :mode="builderModalMode"
      :message-id="builderModalMessageId"
      :users="users"
      @close="closeBuilderModal"
      @message-posted="handleMessagePosted"
      @comment-posted="handleCommentPosted"
    />

    <ConfirmDialog
      v-model:show="confirmShow"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="confirmOkLabel || t('common.ok')"
      :cancel-label="confirmCancelLabel || t('common.cancel')"
      :confirm-variant="confirmVariant"
      @confirm="confirmOnOk"
      @cancel="confirmOnCancel"
    />
  </div>
</template>

<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import Dropdown from "@/Components/Dropdown.vue";
import CommentItem from "@/Components/Messages/CommentItem.vue";
import MessageBuilderModal from "@/Components/Messages/MessageBuilderModal.vue";
import MessageCTA from "@/Components/Messages/MessageCTA.vue";
import MessageReactions from "@/Components/Messages/MessageReactions.vue";
import ViewReactionsModal from "@/Components/Messages/ViewReactionsModal.vue";
import Modal from "@/Components/Modal.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import { usePermissions } from "@/composables/permissions";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useFlashMessage } from "@/composables/useFlashMessage";
import {
  ALLOWED_REACTION_EMOJIS,
  REACTION_EMOJI_NAMES,
  useGroupedReactions
} from "@/composables/useGroupedReactions";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useMessageBuilder } from "@/composables/useMessageBuilder";
import { useMessageLocator } from "@/composables/useMessageLocator";
import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useMedia } from "@/mediaHelpers";
import { Link, router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  messages: {
    type: [Object, Array],
    default: () => ({ data: [] })
  },
  users: {
    type: Array,
    default: () => []
  },
  readOnly: {
    type: Boolean,
    default: false
  }
});

const { canAdmin } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();
const { setFlashMessage } = useFlashMessage();
const { t } = useTranslations();
const {
  show: confirmShow,
  message: confirmMessage,
  title: confirmTitle,
  confirmLabel: confirmOkLabel,
  cancelLabel: confirmCancelLabel,
  confirmVariant,
  ask: askConfirm,
  onConfirmed: confirmOnOk,
  onCancelled: confirmOnCancel
} = useConfirmDialog();
const { isVideo } = useMedia();
const { playSong, openFlyout } = useMusicPlayer();
const { setActiveMessageInput } = useMessageBuilder();
const loading = ref(false);
const messagesChannel = ref(null);
const showReactionModal = ref(false);
const selectedMessageForReaction = ref(null);
const showViewReactionsModal = ref(false);
const viewReactionsGrouped = ref({});
const timelineContainer = ref(null);
const expandedComments = ref({});
const showBuilderModal = ref(false);
const builderModalMode = ref("message");
const builderModalMessageId = ref(null);
const showCommentReactionModal = ref(false);
const selectedCommentForReaction = ref(null);
const selectedMessageForCommentReaction = ref(null);

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
      next_page_url: null
    };
  }
  return props.messages || { data: [], next_page_url: null };
});

const {
  items: infiniteScrollItems,
  infiniteScrollRef,
  pause: pauseInfiniteScroll,
  resume: resumeInfiniteScroll
} = useInfiniteScroll(messagesData.value, messagesPagination);

const normalizeMessage = (message) => ({
  ...message,
  grouped_reactions: message.grouped_reactions || {},
  comments: (message.comments || []).map((comment) => ({
    ...comment,
    grouped_reactions: comment.grouped_reactions || {}
  }))
});

const initializeMessages = (messageArray) =>
  messageArray.map((message) => normalizeMessage(message));

const localMessages = ref(initializeMessages(messagesData.value));

const { saveScrollPosition, restoreScrollPosition, createScrollState } =
  useMessageLocator({
    messages: localMessages,
    normalizeMessage,
    pauseInfiniteScroll,
    resumeInfiniteScroll
  });

const allowedEmojis = ALLOWED_REACTION_EMOJIS;

const currentUserId = computed(() => {
  return usePage().props.auth?.user?.id;
});

const openMessageBuilderModal = () => {
  builderModalMode.value = "message";
  builderModalMessageId.value = null;
  showBuilderModal.value = true;
};

const closeBuilderModal = () => {
  showBuilderModal.value = false;
  builderModalMessageId.value = null;
};

const isCommentModalOpenFor = (messageId) =>
  showBuilderModal.value &&
  builderModalMode.value === "comment" &&
  builderModalMessageId.value === messageId;

const handleMessagePosted = () => {
  closeBuilderModal();
  setTimeout(() => {
    scrollToTimeline();
  }, 300);
};

const handleCommentPosted = () => {
  closeBuilderModal();
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

const getSongThumbnailSrc = (song) => {
  return song.thumbnail_high || song.thumbnail_default;
};

const playSharedSong = async (song) => {
  if (!song?.id) return;
  try {
    const response = await axios.get(route("music.show", song.id), {
      headers: { Accept: "application/json" }
    });
    if (response.data?.song) {
      playSong(response.data.song);
      openFlyout();
    }
  } catch (e) {
    console.error("Failed to load shared song:", e);
  }
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

const GAME_SHARE_SLUG_MARKER = /\uE000g:([a-z0-9-]+)\uE000/g;

const LEGACY_GAME_DISPLAY_NAME_TO_SLUG = {
  "Costco Pizza Poop": "costco-pizza-poop",
  "Poop Boom": "boom",
  "Cockroach Fart": "cockroach"
};

const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const applyGameScoreShareFormatting = (text) => {
  let slugFromMarker = null;
  const withoutMarker = text.replace(GAME_SHARE_SLUG_MARKER, (_, slug) => {
    slugFromMarker = slug;
    return "";
  });

  return withoutMarker.replace(
    /I scored (\d+) in ([^!]+)!(\s*🎮)?/,
    (full, score, rawName, trailingController) => {
      const gameName = rawName.trim();
      const slug = slugFromMarker ?? LEGACY_GAME_DISPLAY_NAME_TO_SLUG[gameName];
      if (!slug) {
        if (trailingController) {
          return `I scored ${score} in ${gameName}!`;
        }
        return full;
      }
      const href = route("games.show", slug);
      const safe = escapeHtml(gameName);
      return `I scored ${score} in <a href="${href}" class="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">${safe}</a>!`;
    }
  );
};

const formatMessage = (text) => {
  if (!text) return "";

  let formatted = applyGameScoreShareFormatting(text);

  if (props.users && props.users.length > 0) {
    const sortedUsers = [...props.users].sort(
      (a, b) => b.name.length - a.name.length
    );

    for (const user of sortedUsers) {
      const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const blockquotePattern1 = new RegExp(
        `@${escapedName}\\n>\\s*([^\\n]*)`,
        "gi"
      );
      formatted = formatted.replace(blockquotePattern1, (match, quote) => {
        const trimmedQuote = quote.trim();
        if (trimmedQuote) {
          return `<span class="font-semibold text-blue-600 dark:text-blue-400">@${user.name}</span>\n<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 py-1 my-2 italic text-gray-600 dark:text-gray-400">${trimmedQuote}</blockquote>`;
        }
        return match;
      });

      const blockquotePattern2 = new RegExp(
        `@${escapedName}\\s*>\\s*([^\\n]*)`,
        "gi"
      );
      formatted = formatted.replace(blockquotePattern2, (match, quote) => {
        if (!match.includes("<blockquote")) {
          const trimmedQuote = quote.trim();
          if (trimmedQuote) {
            return `<span class="font-semibold text-blue-600 dark:text-blue-400">@${user.name}</span> <blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 py-1 my-2 italic text-gray-600 dark:text-gray-400">${trimmedQuote}</blockquote>`;
          }
        }
        return match;
      });
    }
  }

  if (props.users && props.users.length > 0) {
    const sortedUsers = [...props.users].sort(
      (a, b) => b.name.length - a.name.length
    );

    for (const user of sortedUsers) {
      const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

const formatMentionsForSpeech = (text) => {
  if (!text) return "";

  let formatted = text;

  if (props.users?.length) {
    const sortedUsers = [...props.users].sort(
      (a, b) => b.name.length - a.name.length
    );

    for (const user of sortedUsers) {
      const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `@${escapedName}(?=\\s|$|[^\\w\\s>\\n])`,
        "gi"
      );
      formatted = formatted.replace(pattern, user.name);
    }
  }

  return formatted.replace(/@([a-zA-Z0-9_]+)(?!\w)/g, "$1");
};

const speakMessage = (message) => {
  const messageText = formatMentionsForSpeech(message.message);
  const username = message.user?.name || "Someone";
  speak(`${username} says ${messageText}`);
};

const deleteMessage = async (messageId) => {
  const ok = await askConfirm("Are you sure you want to delete this message?");
  if (!ok) {
    return;
  }

  if (builderModalMessageId.value === messageId) {
    closeBuilderModal();
  }
  expandedComments.value[messageId] = false;

  router.delete(route("messages.destroy", messageId), {
    preserveScroll: true,
    onSuccess: () => {
      localMessages.value = localMessages.value.filter(
        (m) => m.id !== messageId
      );
      setActiveMessageInput();
    }
  });
};

const navigateToMessage = (messageId) => {
  let url = route("messages.index");
  if (messageId) {
    url = `${url}#message-${messageId}`;
  }
  router.visit(url);
};

const handleMessageRowClick = (event, messageId) => {
  if (event.target.closest?.("a")) {
    return;
  }
  navigateToMessage(messageId);
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

  const messageIndex = localMessages.value.findIndex((m) => m.id === messageId);
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
      block: "start"
    });
  }
};

onMounted(() => {
  setupEchoListener();
});

onUnmounted(() => {
  cleanup();
});

const getSelectedReactions = (message) => {
  if (!message.grouped_reactions) {
    return [];
  }
  return allowedEmojis.filter((emoji) => getReactionCount(message, emoji) > 0);
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
  viewReactionsGrouped.value = message.grouped_reactions || {};
  showViewReactionsModal.value = true;
};

const openViewCommentReactionsModal = (comment) => {
  viewReactionsGrouped.value = comment.grouped_reactions || {};
  showViewReactionsModal.value = true;
};

const closeViewReactionsModal = () => {
  showViewReactionsModal.value = false;
  viewReactionsGrouped.value = {};
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
          emoji: emoji
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
          emoji: emoji
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
  builderModalMode.value = "comment";
  builderModalMessageId.value = messageId;
  showBuilderModal.value = true;
};

const speakComment = (comment) => {
  const commentText = formatMentionsForSpeech(comment.comment || "");
  const username = comment.user?.name || "Someone";
  speak(`${username} says ${commentText}`);
};

const speakViewReactions = () => {
  const { getSelectedReactions, getReactionUsers } =
    useGroupedReactions(viewReactionsGrouped);

  const selectedReactions = getSelectedReactions();

  if (selectedReactions.length === 0) {
    speak("No reactions");
    return;
  }

  const reactionTexts = selectedReactions
    .map((emoji) => {
      const users = getReactionUsers(emoji);
      const emojiName = REACTION_EMOJI_NAMES[emoji] || "reaction";

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

  speak(`${reactionTexts.join(". ")}.`);
};

const deleteComment = async (messageId, commentId) => {
  const ok = await askConfirm("Are you sure you want to delete this comment?");
  if (!ok) {
    return;
  }

  router.delete(route("messages.comments.destroy", [messageId, commentId]), {
    preserveScroll: true,
    onSuccess: () => {
      const message = localMessages.value.find((m) => m.id === messageId);
      if (message && message.comments) {
        message.comments = message.comments.filter((c) => c.id !== commentId);
      }
    }
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
        route("messages.comments.reactions.destroy", [message.id, comment.id])
      );
    } else {
      response = await axios.post(
        route("messages.comments.reactions.store", [message.id, comment.id]),
        {
          emoji: emoji
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
        route("messages.comments.reactions.destroy", [message.id, comment.id])
      );
    } else {
      response = await axios.post(
        route("messages.comments.reactions.store", [message.id, comment.id]),
        {
          emoji: emoji
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

  const messageIndex = localMessages.value.findIndex((m) => m.id === messageId);
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
      grouped_reactions: commentData.grouped_reactions || {}
    };
    message.comments = [...message.comments, processedComment];
    localMessages.value[messageIndex] = message;
  }
};

const handleCommentReactionUpdate = (event) => {
  const commentId = event.comment_id;
  const messageId = event.message_id;
  const groupedReactions = event.grouped_reactions || {};

  const messageIndex = localMessages.value.findIndex((m) => m.id === messageId);
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
