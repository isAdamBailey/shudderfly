<template>
  <div
    class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-3">
      <Avatar :user="currentUser" size="sm" />
      <div
        class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        {{ t("message.whats_on_your_mind") }}
      </div>
      <button
        type="button"
        class="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        :title="t('message.create_message')"
      >
        <i class="ri-add-line text-xl"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import Avatar from "@/Components/Avatar.vue";
import { useTranslations } from "@/composables/useTranslations";
import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

defineEmits(["click"]);

const { t } = useTranslations();

const currentUser = computed(() => {
  return usePage().props.auth?.user;
});
</script>

