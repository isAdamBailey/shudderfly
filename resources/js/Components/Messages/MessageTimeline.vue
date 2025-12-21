<template>
  <div ref="timelineContainer" class="space-y-4">
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
      class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 scroll-mt-4 relative"
    >
      <!-- Header with buttons -->
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <Avatar :user="message.user" size="sm" />
          <span class="font-semibold text-gray-900 dark:text-gray-100">
            {{ message.user.name }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(message.created_at) }}
          </span>
        </div>
        <!-- Buttons in top right -->
        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
          <Button
            type="button"
            :disabled="speaking"
            :title="t('message.speak')"
            :aria-label="t('message.speak_aria')"
            class="w-8 h-8 p-0 flex items-center justify-center"
            @click="speakMessage(message)"
          >
            <i class="ri-speak-fill text-base"></i>
          </Button>
          <DangerButton
            v-if="canAdmin"
            type="button"
            :title="t('message.delete')"
            :aria-label="t('message.delete_aria')"
            class="w-8 h-8 p-0 flex items-center justify-center"
            @click="deleteMessage(message.id)"
          >
            <i class="ri-delete-bin-line text-base"></i>
          </DangerButton>
        </div>
      </div>

      <!-- Content area - full width below buttons -->
      <div class="w-full">
        <div
          class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
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
          class="mt-0.5 mb-1 -mx-4 sm:mx-0 sm:max-w-[400px] md:mt-3 md:mb-3"
        >
          <Link
            :href="route('pages.show', message.page_id)"
            class="block rounded-lg overflow-hidden w-full sm:rounded-lg"
          >
            <img
              :src="getPageImageSrc(message.page)"
              :alt="
                message.page.content
                  ? stripHtml(message.page.content).substring(0, 50)
                  : t('message.shared_page')
              "
              class="w-full h-auto object-contain"
              loading="lazy"
            />
          </Link>
        </div>
        <!-- Reactions -->
        <div class="mt-2 md:mt-3 flex flex-wrap items-center gap-2">
          <!-- Only show reactions that have been selected (count > 0) -->
          <div
            v-for="emoji in getSelectedReactions(message)"
            :key="emoji"
            class="flex items-center gap-1"
          >
            <button
              type="button"
              :class="[
                'flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors',
                hasUserReacted(message, emoji)
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              ]"
              :title="getReactionTooltip(message, emoji)"
              @click="toggleReaction(message, emoji)"
            >
              <span class="text-base">{{ emoji }}</span>
              <span
                v-if="getReactionCount(message, emoji) > 0"
                class="font-medium"
              >
                {{ getReactionCount(message, emoji) }}
              </span>
            </button>
          </div>
          <!-- Add reaction button -->
          <button
            type="button"
            class="flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            :title="t('message.add_reaction')"
            @click="openReactionModal(message)"
          >
            <i class="ri-add-line text-base"></i>
          </button>
          <!-- View all reactions button -->
          <button
            v-if="hasAnyReactions(message)"
            type="button"
            class="flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            :title="t('message.view_all_reactions')"
            @click="openViewReactionsModal(message)"
          >
            <i class="ri-information-line text-base"></i>
          </button>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <div class="flex items-center justify-between mb-2 gap-2">
          <Button
            type="button"
            class="flex items-center gap-2"
            @click="toggleComments(message.id)"
          >
            <i
              :class="[
                'text-base transition-transform',
                expandedComments[message.id]
                  ? 'ri-arrow-down-s-line'
                  : 'ri-arrow-right-s-line'
              ]"
            ></i>
            <span>
              {{ getCommentCount(message) }}
              {{
                getCommentCount(message) === 1
                  ? t("message.comment")
                  : t("message.comments")
              }}
            </span>
          </Button>
          <Button
            v-if="!expandedComments[message.id]"
            type="button"
            @click="expandComments(message.id)"
          >
            <i class="ri-add-line mr-1"></i>
            {{ t("message.add_comment") }}
          </Button>
        </div>

        <template v-if="expandedComments[message.id]">
          <div class="space-y-3">
            <!-- Comment Form -->
            <form class="space-y-2" @submit.prevent="submitComment(message)">
              <textarea
                v-model="commentForms[message.id]"
                :placeholder="t('message.comment_placeholder')"
                maxlength="1000"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              ></textarea>
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

            <!-- Comments List -->
            <div v-if="getComments(message).length > 0" class="space-y-3">
              <div
                v-for="comment in getComments(message)"
                :key="comment.id"
                class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3"
              >
                <!-- Header with buttons -->
                <div class="flex items-start justify-between mb-1">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar :user="comment.user" size="sm" />
                    <span
                      class="font-semibold text-sm text-gray-900 dark:text-gray-100"
                    >
                      {{ comment.user.name }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(comment.created_at) }}
                    </span>
                  </div>
                  <!-- Buttons in top right -->
                  <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Button
                      type="button"
                      :disabled="speaking"
                      :title="t('comment.speak')"
                      :aria-label="t('comment.speak_aria')"
                      class="w-8 h-8 p-0 flex items-center justify-center"
                      @click="speakComment(comment)"
                    >
                      <i class="ri-speak-fill text-base"></i>
                    </Button>
                    <DangerButton
                      v-if="canAdmin"
                      type="button"
                      :title="t('comment.delete')"
                      :aria-label="t('comment.delete_aria')"
                      class="w-8 h-8 p-0 flex items-center justify-center"
                      @click="deleteComment(message.id, comment.id)"
                    >
                      <i class="ri-delete-bin-line text-base"></i>
                    </DangerButton>
                  </div>
                </div>

                <!-- Content area - full width below buttons -->
                <div class="w-full">
                  <div
                    class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
                  >
                    {{ comment.comment }}
                  </div>
                  <!-- Comment Reactions -->
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <div
                      v-for="emoji in getSelectedCommentReactions(comment)"
                      :key="emoji"
                      class="flex items-center gap-1"
                    >
                      <button
                        type="button"
                        :class="[
                          'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
                          hasUserReactedToComment(comment, emoji)
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        ]"
                        :title="getCommentReactionTooltip(comment, emoji)"
                        @click="toggleCommentReaction(message, comment, emoji)"
                      >
                        <span class="text-sm">{{ emoji }}</span>
                        <span
                          v-if="getCommentReactionCount(comment, emoji) > 0"
                          class="font-medium text-xs"
                        >
                          {{ getCommentReactionCount(comment, emoji) }}
                        </span>
                      </button>
                    </div>
                    <!-- Add reaction button -->
                    <button
                      type="button"
                      class="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      :title="t('comment.add_reaction')"
                      @click="openCommentReactionModal(message, comment)"
                    >
                      <i class="ri-add-line text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4 text-gray-500">
      {{ t("message.loading") }}
    </div>

    <!-- Infinite scroll trigger -->
    <div ref="infiniteScrollRef" class="h-4"></div>

    <!-- Scroll to timeline button -->
    <ScrollTop :method="scrollToTimeline" :skip-scroll-to-top="true" />

    <!-- Reaction Selection Modal -->
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

    <!-- View All Reactions Modal -->
    <Modal
      :show="showViewReactionsModal"
      max-width="sm"
      @close="closeViewReactionsModal"
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
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
            v-for="emoji in getSelectedReactions(selectedMessageForView)"
            :key="emoji"
            class="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">{{ emoji }}</span>
              <span
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {{ getReactionCount(selectedMessageForView, emoji) }}
                {{
                  getReactionCount(selectedMessageForView, emoji) === 1
                    ? t("message.reaction")
                    : t("message.reactions")
                }}
              </span>
            </div>
            <div class="space-y-1 ml-8">
              <div
                v-for="user in getReactionUsers(selectedMessageForView, emoji)"
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

    <!-- Comment Reaction Selection Modal -->
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
  </div>
</template>

<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import Button from "@/Components/Button.vue";
import DangerButton from "@/Components/DangerButton.vue";
import Modal from "@/Components/Modal.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import { usePermissions } from "@/composables/permissions";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useMessageBuilder } from "@/composables/useMessageBuilder";
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
  }
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
const commentForms = ref({});
const showCommentReactionModal = ref(false);
const selectedCommentForReaction = ref(null);
const selectedMessageForCommentReaction = ref(null);

// Handle both pagination object and array formats
const messagesData = computed(() => {
  if (Array.isArray(props.messages)) {
    return props.messages;
  }
  return props.messages?.data || [];
});

const messagesPagination = computed(() => {
  if (Array.isArray(props.messages)) {
    // If it's an array, create a mock pagination object
    return {
      data: props.messages,
      next_page_url: null
    };
  }
  return props.messages || { data: [], next_page_url: null };
});

const { items: infiniteScrollItems, infiniteScrollRef } = useInfiniteScroll(
  messagesData.value,
  messagesPagination
);

const initializeMessages = (messageArray) => {
  return messageArray.map((msg) => {
    const message = {
      ...msg,
      grouped_reactions: msg.grouped_reactions || {},
      comments: (msg.comments || []).map((comment) => ({
        ...comment,
        grouped_reactions: comment.grouped_reactions || {}
      }))
    };
    return message;
  });
};

const localMessages = ref(initializeMessages(messagesData.value));

const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "💩"];

const currentUserId = computed(() => {
  return usePage().props.auth?.user?.id;
});

watch(
  () => infiniteScrollItems.value,
  (newItems) => {
    const newItemsIds = new Set(newItems.map((m) => m.id));

    // Keep Echo-added messages that aren't in the paginated items
    const echoMessages = localMessages.value.filter(
      (m) => !newItemsIds.has(m.id)
    );

    // Merge paginated items with Echo messages
    const allMessages = [...newItems, ...echoMessages];

    // Ensure all messages have grouped_reactions and comments initialized
    const processedMessages = allMessages.map((msg) => {
      const processed = { ...msg };
      if (!processed.grouped_reactions) {
        processed.grouped_reactions = {};
      }
      if (!processed.comments) {
        processed.comments = [];
      }
      processed.comments = (processed.comments || []).map((comment) => ({
        ...comment,
        grouped_reactions: comment.grouped_reactions || {}
      }));
      return processed;
    });

    // Sort by created_at (most recent first)
    localMessages.value = processedMessages.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA; // Most recent first
    });
  },
  { deep: true, immediate: true }
);

watch(
  () => messagesData.value,
  (newMessages) => {
    const propsIds = new Set(newMessages.map((m) => m.id));

    // Keep existing messages that aren't in the new props (Echo-added messages)
    const existingMessagesToKeep = localMessages.value.filter(
      (m) => !propsIds.has(m.id)
    );

    // Merge: combine all messages and sort by created_at (most recent first)
    const allMessages = [...newMessages, ...existingMessagesToKeep];
    // Ensure all messages have grouped_reactions and comments initialized
    const processedMessages = allMessages.map((msg) => {
      const processed = { ...msg };
      if (!processed.grouped_reactions) {
        processed.grouped_reactions = {};
      }
      if (!processed.comments) {
        processed.comments = [];
      }
      processed.comments = (processed.comments || []).map((comment) => ({
        ...comment,
        grouped_reactions: comment.grouped_reactions || {}
      }));
      return processed;
    });
    localMessages.value = processedMessages.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA; // Most recent first
    });
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

  // First, match full usernames (with spaces) - most specific first
  if (props.users && props.users.length > 0) {
    // Sort by length (longest first) to match full names before partial matches
    const sortedUsers = [...props.users].sort(
      (a, b) => b.name.length - a.name.length
    );

    for (const user of sortedUsers) {
      // Escape special regex characters in username
      const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Match @username followed by space, punctuation, or end of string
      const pattern = new RegExp(`@${escapedName}(?=\\s|$|[^\\w\\s])`, "gi");
      formatted = formatted.replace(
        pattern,
        `<span class="font-semibold text-blue-600 dark:text-blue-400">@${user.name}</span>`
      );
    }
  }

  // Then, match any remaining simple @mentions (single word) that weren't matched
  formatted = formatted.replace(
    /@([a-zA-Z0-9_]+)(?!\w)/g,
    (match, username) => {
      // Only highlight if it's not already inside a span (not already highlighted)
      if (!match.includes("<span")) {
        return `<span class="font-semibold text-blue-600 dark:text-blue-400">@${username}</span>`;
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
    "💩": "poop"
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

  // Clean up
  delete commentForms.value[messageId];
  expandedComments.value[messageId] = false;

  router.delete(route("messages.destroy", messageId), {
    preserveScroll: true,
    onSuccess: () => {
      // Remove from local messages array
      localMessages.value = localMessages.value.filter(
        (m) => m.id !== messageId
      );
      // Reset to message input if needed
      setActiveMessageInput();
    }
  });
};

const setupEchoListener = () => {
  if (!window.Echo) {
    // Retry after a short delay
    setTimeout(setupEchoListener, 500);
    return;
  }

  // Prevent multiple subscriptions
  if (messagesChannel.value) {
    return;
  }

  try {
    // Subscribe to private messages channel (requires authentication)
    messagesChannel.value = window.Echo.private("messages");

    // Listen for subscription errors (if method exists - for test compatibility)
    if (messagesChannel.value.error) {
      messagesChannel.value.error((error) => {
        console.error("Error subscribing to messages channel:", error);
      });
    }

    // Listen for new messages
    // Laravel Echo automatically handles the dot prefix when using broadcastAs()
    messagesChannel.value.listen(".MessageCreated", (event) => {
      handleMessageEvent(event);
    });

    // Listen for reaction updates
    messagesChannel.value.listen(".MessageReactionUpdated", (event) => {
      handleReactionUpdate(event);
    });

    // Listen for new comments
    messagesChannel.value.listen(".CommentCreated", (event) => {
      handleCommentEvent(event);
    });

    // Listen for comment reaction updates
    messagesChannel.value.listen(".CommentReactionUpdated", (event) => {
      handleCommentReactionUpdate(event);
    });
  } catch (error) {
    console.error("Error setting up Echo listener:", error);
  }
};

const handleMessageEvent = (event) => {
  // Laravel Echo puts broadcastWith() data directly on the event object
  const messageData = event;

  // Ensure message has required structure
  if (!messageData || !messageData.id || !messageData.user) {
    return;
  }

  // Check if message already exists to avoid duplicates
  const messageExists = localMessages.value.some(
    (m) => m.id === messageData.id
  );

  if (!messageExists) {
    // Ensure grouped_reactions is initialized
    if (!messageData.grouped_reactions) {
      messageData.grouped_reactions = {};
    }
    if (!messageData.comments) {
      messageData.comments = [];
    }
    // Add new message and sort by created_at (most recent first)
    localMessages.value.push(messageData);
    localMessages.value.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA; // Most recent first
    });

    // Show info message for all users when a new message is received
    const successMessage = event.success_message || messageData.success_message;
    if (successMessage) {
      setFlashMessage("info", successMessage, 5000);
    } else if (messageData.user?.name) {
      // Fallback: create message if not provided in event
      const fallbackMessage = `New message added by ${messageData.user.name}`;
      setFlashMessage("info", fallbackMessage, 5000);
    }
  }
};

const handleReactionUpdate = (event) => {
  const messageId = event.message_id;
  const groupedReactions = event.grouped_reactions || {};

  // Find the message and update its reactions
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

const scrollToMessage = async () => {
  // Check if window and location are available (for test environments)
  if (typeof window === "undefined" || !window?.location) {
    return;
  }

  // Check if there's a hash in the URL (e.g., #message-123)
  const hash = window.location?.hash;
  if (hash && hash.startsWith("#message-")) {
    const messageId = parseInt(hash.replace("#message-", ""), 10);
    if (!messageId) return;

    // Check if message exists in current messages
    const messageExists = localMessages.value.some((m) => m.id === messageId);

    if (!messageExists) {
      // Message not in current page, fetch it
      try {
        const response = await axios.get(route("messages.show", messageId));
        const fetchedMessage = response.data;
        // Ensure grouped_reactions and comments are initialized
        if (!fetchedMessage.grouped_reactions) {
          fetchedMessage.grouped_reactions = {};
        }
        if (!fetchedMessage.comments) {
          fetchedMessage.comments = [];
        }
        fetchedMessage.comments = (fetchedMessage.comments || []).map(
          (comment) => ({
            ...comment,
            grouped_reactions: comment.grouped_reactions || {}
          })
        );
        // Add the message and sort by created_at (most recent first)
        localMessages.value.push(fetchedMessage);
        localMessages.value.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateB - dateA; // Most recent first
        });
        // Wait for DOM to update
        await nextTick();
      } catch (error) {
        console.error("Failed to fetch message:", error);
        return;
      }
    }

    // Wait for next tick to ensure DOM is updated
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add a highlight effect
        element.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
        }, 2000);
      }
    }, 100);
  }
};

onMounted(() => {
  setupEchoListener();
  scrollToMessage();

  // Also listen for hash changes (in case user navigates with back/forward)
  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function"
  ) {
    window.addEventListener("hashchange", scrollToMessage);
  }
});

onUnmounted(() => {
  cleanup();
  if (
    typeof window !== "undefined" &&
    typeof window.removeEventListener === "function"
  ) {
    window.removeEventListener("hashchange", scrollToMessage);
  }
});

// Reaction functions
const getSelectedReactions = (message) => {
  if (!message.grouped_reactions) {
    return [];
  }
  // Return only emojis that have been selected (count > 0)
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

const getReactionTooltip = (message, emoji) => {
  const count = getReactionCount(message, emoji);
  if (count === 0) {
    return `React with ${emoji}`;
  }
  const users = getReactionUsers(message, emoji);
  const userNames = users.map((u) => u.name).join(", ");
  return `${emoji} ${count}: ${userNames}`;
};

const hasAnyReactions = (message) => {
  if (!message.grouped_reactions) {
    return false;
  }
  return getSelectedReactions(message).length > 0;
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
          emoji: emoji
        }
      );
    }

    // Update local state with server response
    if (response?.data?.grouped_reactions) {
      message.grouped_reactions = response.data.grouped_reactions;
    }

    // Close modal after selection
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

// Comment functions
const getComments = (message) => {
  if (!message.comments) {
    return [];
  }
  return [...message.comments].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return dateA - dateB; // Oldest first
  });
};

const getCommentCount = (message) => {
  return message.comments?.length || 0;
};

const toggleComments = (messageId) => {
  if (expandedComments.value[messageId]) {
    expandedComments.value[messageId] = false;
  } else {
    expandedComments.value[messageId] = true;
    if (!commentForms.value[messageId]) {
      commentForms.value[messageId] = "";
    }
  }
};

const expandComments = (messageId) => {
  expandedComments.value[messageId] = true;
  if (!commentForms.value[messageId]) {
    commentForms.value[messageId] = "";
  }
};

const submitComment = async (message) => {
  const commentText = commentForms.value[message.id]?.trim();
  if (!commentText) {
    return;
  }

  commentForms.value[message.id] = "";

  try {
    await router.post(
      route("messages.comments.store", message.id),
      {
        comment: commentText
      },
      {
        preserveScroll: true,
        onSuccess: () => {},
        onError: () => {
          commentForms.value[message.id] = commentText;
        }
      }
    );
  } catch (error) {
    commentForms.value[message.id] = commentText;
    setFlashMessage("error", "Failed to post comment. Please try again.", 3000);
  }
};

const speakComment = (comment) => {
  const commentText = comment.comment || "";
  const username = comment.user?.name || "Someone";
  speak(`${username} says ${commentText}`);
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
        message.comments = message.comments.filter((c) => c.id !== commentId);
      }
    }
  });
};

// Comment reaction functions
const getSelectedCommentReactions = (comment) => {
  if (!comment.grouped_reactions) {
    return [];
  }
  return allowedEmojis.filter(
    (emoji) => getCommentReactionCount(comment, emoji) > 0
  );
};

const getCommentReactionCount = (comment, emoji) => {
  if (!comment.grouped_reactions || !comment.grouped_reactions[emoji]) {
    return 0;
  }
  return comment.grouped_reactions[emoji].count || 0;
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

const getCommentReactionTooltip = (comment, emoji) => {
  const count = getCommentReactionCount(comment, emoji);
  if (count === 0) {
    return `React with ${emoji}`;
  }
  const users = getCommentReactionUsers(comment, emoji);
  const userNames = users.map((u) => u.name).join(", ");
  return `${emoji} ${count}: ${userNames}`;
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

  // Find the message
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
