<template>
  <div class="space-y-4">
    <div
      v-if="messages.length === 0 && !loading"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      No messages yet. Be the first to post!
    </div>

    <div
      v-for="message in messages"
      :key="message.id"
      class="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
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
  </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import DangerButton from "@/Components/DangerButton.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  users: {
    type: Array,
    default: () => []
  }
});

const { canAdmin } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();
const loading = ref(false);
const messagesChannel = ref(null);

const messages = ref([...props.messages]);

// Watch for prop changes
watch(
  () => props.messages,
  (newMessages) => {
    messages.value = [...newMessages];
  },
  { deep: true }
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
  speak(messageText);
};

const deleteMessage = (messageId) => {
  if (!confirm("Are you sure you want to delete this message?")) {
    return;
  }

  router.delete(route("messages.destroy", messageId), {
    preserveScroll: true,
    onSuccess: () => {
      // Remove from local messages array
      messages.value = messages.value.filter((m) => m.id !== messageId);
    }
  });
};

const setupEchoListener = () => {
  if (!window.Echo) {
    // Retry after a short delay
    setTimeout(setupEchoListener, 500);
    return;
  }

  // Subscribe to private messages channel (requires authentication)
  messagesChannel.value = window.Echo.private("messages");

  // Listen for new messages
  // Laravel Echo automatically prefixes with the event namespace
  messagesChannel.value.listen(".App\\Events\\MessageCreated", (event) => {
    // Add new message to the beginning of the array
    messages.value.unshift(event);
  });
};

const cleanup = () => {
  if (messagesChannel.value && window.Echo) {
    try {
      window.Echo.leave("messages");
    } catch {}
    messagesChannel.value = null;
  }
};

onMounted(() => {
  setupEchoListener();
});

onUnmounted(() => {
  cleanup();
});
</script>
