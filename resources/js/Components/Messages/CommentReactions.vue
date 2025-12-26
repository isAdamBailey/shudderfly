<template>
  <div class="mt-2 flex flex-wrap items-center gap-2">
    <div
      v-for="emoji in selectedReactions"
      :key="emoji"
      class="flex items-center gap-1"
    >
      <button
        type="button"
        :class="[
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
          hasUserReacted(emoji)
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        :title="getReactionTooltip(emoji)"
        @click="$emit('toggle-reaction', emoji)"
      >
        <span class="text-sm">{{ emoji }}</span>
        <span v-if="getReactionCount(emoji) > 0" class="font-medium text-xs">
          {{ getReactionCount(emoji) }}
        </span>
      </button>
    </div>
    <!-- Add reaction button -->
    <button
      type="button"
      class="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
      :title="t('comment.add_reaction')"
      @click="$emit('add-reaction')"
    >
      <i class="ri-add-line text-xs"></i>
    </button>
  </div>
</template>

<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { computed } from "vue";

const props = defineProps({
  groupedReactions: {
    type: Object,
    default: () => ({})
  },
  selectedReactions: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: Number,
    default: null
  }
});

defineEmits(["toggle-reaction", "add-reaction"]);

const { t } = useTranslations();

const getReactionCount = (emoji) => {
  if (!props.groupedReactions || !props.groupedReactions[emoji]) {
    return 0;
  }
  return props.groupedReactions[emoji].count || 0;
};

const getReactionUsers = (emoji) => {
  if (!props.groupedReactions || !props.groupedReactions[emoji]) {
    return [];
  }
  return props.groupedReactions[emoji].users || [];
};

const hasUserReacted = (emoji) => {
  if (!props.currentUserId) return false;
  const users = getReactionUsers(emoji);
  return users.some((user) => user.id === props.currentUserId);
};

const getReactionTooltip = (emoji) => {
  const count = getReactionCount(emoji);
  if (count === 0) {
    return `React with ${emoji}`;
  }
  const users = getReactionUsers(emoji);
  const userNames = users.map((u) => u.name).join(", ");
  return `${emoji} ${count}: ${userNames}`;
};
</script>

