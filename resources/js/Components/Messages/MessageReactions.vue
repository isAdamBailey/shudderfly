<template>
  <div :class="containerClass">
    <div
      v-for="emoji in effectiveSelectedReactions"
      :key="emoji"
      class="flex items-center gap-1"
    >
      <button
        type="button"
        :class="[
          'flex items-center gap-1 rounded-full transition-colors',
          sizeClasses.button,
          hasUserReacted(emoji, currentUserId)
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        :title="getReactionTooltip(emoji)"
        @click="$emit('toggle-reaction', emoji)"
      >
        <span :class="sizeClasses.emoji">{{ emoji }}</span>
        <span
          v-if="getReactionCount(emoji) > 0"
          :class="['font-medium', sizeClasses.count]"
        >
          {{ getReactionCount(emoji) }}
        </span>
      </button>
    </div>
    <button
      type="button"
      :class="[
        'flex items-center gap-1 rounded-full transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
        sizeClasses.button
      ]"
      :title="addReactionLabel"
      @click="$emit('add-reaction')"
    >
      <i :class="[sizeClasses.addIcon, 'ri-add-line']"></i>
    </button>
    <button
      v-if="hasAnyReactions()"
      type="button"
      :class="[
        'flex items-center gap-1 rounded-full transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
        sizeClasses.button
      ]"
      :title="t('message.view_all_reactions')"
      @click="$emit('view-reactions')"
    >
      <i :class="[sizeClasses.addIcon, 'ri-information-line']"></i>
    </button>
  </div>
</template>

<script setup>
import { useGroupedReactions } from "@/composables/useGroupedReactions";
import { useTranslations } from "@/composables/useTranslations";
import { computed, toRef } from "vue";

const props = defineProps({
  groupedReactions: {
    type: Object,
    default: () => ({})
  },
  selectedReactions: {
    type: Array,
    default: null
  },
  currentUserId: {
    type: Number,
    default: null
  },
  compact: {
    type: Boolean,
    default: false
  }
});

defineEmits(["toggle-reaction", "add-reaction", "view-reactions"]);

const { t } = useTranslations();

const groupedReactionsRef = toRef(props, "groupedReactions");
const {
  getReactionCount,
  getReactionUsers,
  getSelectedReactions,
  hasUserReacted,
  hasAnyReactions,
} = useGroupedReactions(groupedReactionsRef);

const effectiveSelectedReactions = computed(() => {
  if (Array.isArray(props.selectedReactions) && props.selectedReactions.length > 0) {
    return props.selectedReactions;
  }
  return getSelectedReactions();
});

const addReactionLabel = computed(() =>
  props.compact ? t("comment.add_reaction") : t("message.add_reaction")
);

const containerClass = computed(() =>
  props.compact
    ? "mt-2 flex flex-wrap items-center gap-2"
    : "mt-2 md:mt-3 flex flex-wrap items-center gap-2"
);

const sizeClasses = computed(() =>
  props.compact
    ? {
        button: "px-2 py-1 text-xs",
        emoji: "text-sm",
        count: "text-xs",
        addIcon: "text-xs",
      }
    : {
        button: "px-2 py-1 text-sm",
        emoji: "text-base",
        count: "",
        addIcon: "text-base",
      }
);

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
