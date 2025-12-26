<template>
  <div
    class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border-l-4 border-blue-400 dark:border-blue-500 ml-2"
  >
    <!-- Header with buttons -->
    <div class="flex items-start justify-between mb-1">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <Avatar :user="comment.user" size="sm" />
        <span class="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {{ comment.user.name }}
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
      >
        {{ comment.comment }}
      </div>
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
import Button from "@/Components/Button.vue";
import CommentReactions from "@/Components/Messages/CommentReactions.vue";
import DangerButton from "@/Components/DangerButton.vue";
import Dropdown from "@/Components/Dropdown.vue";
import { usePermissions } from "@/composables/permissions";
import { useTranslations } from "@/composables/useTranslations";
import { computed } from "vue";

const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  speaking: {
    type: Boolean,
    default: false
  },
  currentUserId: {
    type: Number,
    default: null
  }
});

defineEmits(["speak", "delete", "toggle-reaction", "add-reaction"]);

const { canAdmin } = usePermissions();
const { t } = useTranslations();

const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "💩"];

const selectedCommentReactions = computed(() => {
  if (!props.comment.grouped_reactions) {
    return [];
  }
  return allowedEmojis.filter(
    (emoji) => getCommentReactionCount(emoji) > 0
  );
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

