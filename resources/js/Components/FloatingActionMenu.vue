<script setup>
import Dropdown from "@/Components/Dropdown.vue";

defineProps({
  width: {
    type: String,
    default: "56"
  },
  iconClass: {
    type: String,
    default: "ri-more-2-fill text-2xl"
  },
  ariaLabel: {
    type: String,
    default: "Menu"
  }
});
</script>

<template>
  <div class="fixed bottom-20 right-5 z-50 inline-flex shrink-0">
    <Dropdown
      class="inline-flex shrink-0"
      align="right"
      :width="width"
      :drop-up="true"
    >
      <template #trigger>
        <button
          type="button"
          class="box-border flex h-14 w-14 min-h-[3.5rem] min-w-[3.5rem] shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-theme-primary p-0 text-theme-button shadow-2xl transition ease-in-out duration-150 hover:bg-theme-button hover:text-theme-button-hover active:bg-theme-button dark:border-amber-400/70 dark:!bg-indigo-600 dark:text-white dark:shadow-[0_4px_28px_rgba(251,191,36,0.35)] dark:ring-2 dark:ring-amber-400/50 dark:hover:bg-theme-button dark:hover:text-theme-button-hover"
          :aria-label="ariaLabel"
        >
          <i :class="iconClass" aria-hidden="true"></i>
        </button>
      </template>
      <template #content>
        <slot />
      </template>
    </Dropdown>
  </div>
</template>
