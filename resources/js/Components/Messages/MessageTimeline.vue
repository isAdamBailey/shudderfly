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
      class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 scroll-mt-4"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <Avatar :user="message.user" size="sm" />
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ message.user.name }}
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(message.created_at) }}
            </span>
          </div>
          <div
            class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
            v-html="formatMessage(message.message)"
          ></div>
          <!-- Reactions -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
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
              title="Add reaction"
              @click="openReactionModal(message)"
            >
              <i class="ri-add-line text-base"></i>
            </button>
            <!-- View all reactions button -->
            <button
              v-if="hasAnyReactions(message)"
              type="button"
              class="flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              title="View all reactions"
              @click="openViewReactionsModal(message)"
            >
              <i class="ri-information-line text-base"></i>
            </button>
          </div>
        </div>
        <div class="ml-4 flex items-center gap-2">
          <Button
            type="button"
            :disabled="speaking"
            title="Speak message"
            aria-label="Speak message"
            @click="speakMessage(message)"
          >
            <i class="ri-speak-fill text-xl"></i>
          </Button>
          <DangerButton
            v-if="canAdmin"
            type="button"
            title="Delete message"
            aria-label="Delete message"
            @click="deleteMessage(message.id)"
          >
            <i class="ri-delete-bin-line text-xl"></i>
          </DangerButton>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4 text-gray-500">Loading...</div>

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
            Reactions
          </h2>
          <Button
            v-if="selectedMessageForView"
            type="button"
            :disabled="speaking"
            title="Speak all reactions"
            aria-label="Speak all reactions"
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
                    ? "reaction"
                    : "reactions"
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
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router, usePage } from "@inertiajs/vue3";
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
const loading = ref(false);
const messagesChannel = ref(null);
const showReactionModal = ref(false);
const selectedMessageForReaction = ref(null);
const showViewReactionsModal = ref(false);
const selectedMessageForView = ref(null);
const timelineContainer = ref(null);

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

// Use infinite scroll composable
const { items: infiniteScrollItems, infiniteScrollRef } = useInfiniteScroll(
  messagesData.value,
  messagesPagination
);

// Initialize messages with grouped_reactions and merge with infinite scroll items
const initializeMessages = (messageArray) => {
  return messageArray.map((msg) => ({
    ...msg,
    grouped_reactions: msg.grouped_reactions || {}
  }));
};

// Use infinite scroll items as the base, but manage separately for Echo updates
const localMessages = ref(initializeMessages(messagesData.value));

// Allowed emojis for reactions
const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢"];

// Get current user ID
const currentUserId = computed(() => {
  return usePage().props.auth?.user?.id;
});

// Watch for infinite scroll items changes (from pagination)
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

    // Ensure all messages have grouped_reactions initialized
    allMessages.forEach((msg) => {
      if (!msg.grouped_reactions) {
        msg.grouped_reactions = {};
      }
    });

    // Sort by created_at (most recent first)
    localMessages.value = allMessages.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA; // Most recent first
    });
  },
  { deep: true, immediate: true }
);

// Watch for prop changes (initial load or page refresh)
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
    // Ensure all messages have grouped_reactions initialized
    allMessages.forEach((msg) => {
      if (!msg.grouped_reactions) {
        msg.grouped_reactions = {};
      }
    });
    localMessages.value = allMessages.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA; // Most recent first
    });
  },
  { deep: true, immediate: false }
);

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
    "😢": "sad"
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

  router.delete(route("messages.destroy", messageId), {
    preserveScroll: true,
    onSuccess: () => {
      // Remove from local messages array
      localMessages.value = localMessages.value.filter(
        (m) => m.id !== messageId
      );
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
        // Ensure grouped_reactions is initialized
        if (!fetchedMessage.grouped_reactions) {
          fetchedMessage.grouped_reactions = {};
        }
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
</script>
