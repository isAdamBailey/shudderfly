<template>
  <Head title="Chat" />

  <AuthenticatedLayout>
    <template #header>
      <h2 class="font-heading text-4xl text-theme-title leading-tight">
        Chat
      </h2>
    </template>

    <div class="py-10">
      <div v-if="!messagingEnabled" class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded">
          Messaging is currently disabled. Please contact an administrator.
        </div>
      </div>

      <div v-else class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
        <!-- Message Builder -->
        <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <MessageBuilder :users="users" />
        </div>

        <!-- Message Timeline -->
        <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
          <h3 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Timeline
          </h3>
          <MessageTimeline :messages="messages" :users="users" />
        </div>
      </div>
    </div>
  </AuthenticatedLayout>
</template>

<script setup>
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import MessageBuilder from "@/Components/Messages/MessageBuilder.vue";
import MessageTimeline from "@/Components/Messages/MessageTimeline.vue";
import { Head } from "@inertiajs/vue3";

defineProps({
  messages: {
    type: Object,
    default: () => ({ data: [] })
  },
  messagingEnabled: {
    type: Boolean,
    default: false
  },
  users: {
    type: Array,
    default: () => []
  }
});
</script>

