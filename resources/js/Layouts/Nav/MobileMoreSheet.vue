<script setup>
import Avatar from "@/Components/Avatar.vue";
import NavMenuItem from "@/Layouts/Nav/NavMenuItem.vue";
import { Link } from "@inertiajs/vue3";

defineProps({
  open: {
    type: Boolean,
    default: false
  },
  pageItems: {
    type: Array,
    default: () => []
  },
  utilityItems: {
    type: Array,
    default: () => []
  },
  user: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["close"]);
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] md:hidden"
    role="dialog"
    aria-modal="true"
    aria-label="More navigation options"
  >
    <button
      type="button"
      class="absolute inset-0 bg-gray-950/60"
      @click="emit('close')"
      aria-label="Close more menu"
    ></button>

    <section
      class="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-gray-700 bg-gray-900 px-4 pb-6 pt-4"
      style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem)"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-white">More</h2>
        <button
          type="button"
          class="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-gray-600 text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
          @click="emit('close')"
          aria-label="Close more menu"
        >
          <i class="ri-close-line text-2xl" aria-hidden="true"></i>
        </button>
      </div>

      <Link
        v-if="user"
        :href="route('users.show', user.email)"
        class="mb-4 flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800 px-3 py-3 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
        @click="emit('close')"
      >
        <Avatar :user="user" size="md" />
        <div>
          <div class="text-base font-semibold text-white">
            {{ user.name }}
          </div>
          <div class="text-sm text-gray-300">{{ user.email }}</div>
        </div>
      </Link>

      <div class="space-y-2">
        <NavMenuItem
          v-for="item in pageItems"
          :key="item.label"
          :href="item.href"
          :label="item.label"
          :icon="item.icon"
          :active="item.active"
          @click="emit('close')"
        />
      </div>

      <div class="mt-4 space-y-2">
        <NavMenuItem
          v-for="item in utilityItems"
          :key="item.label"
          :href="item.href"
          :label="item.label"
          :icon="item.icon"
          :method="item.method"
          :as="item.as"
          :use-active-style="false"
          @click="emit('close')"
        />
      </div>
    </section>
  </div>
</template>
