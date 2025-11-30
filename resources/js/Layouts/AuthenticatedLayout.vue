<script setup>
import FlashMessage from "@/Components/Flash.vue";
import MusicFlyout from "@/Components/Music/MusicFlyout.vue";
import SearchInput from "@/Components/SearchInput.vue";
import Footer from "@/Layouts/Nav/Footer.vue";
import Navigation from "@/Layouts/Nav/Navigation.vue";
import { usePusherNotifications } from "@/composables/usePusherNotifications";

// Set up Pusher notifications for authenticated users
usePusherNotifications();
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <div class="flex flex-col flex-grow bg-gray-900">
      <Navigation />

      <FlashMessage />

      <SearchInput />

      <header v-if="$slots.header" class="border-gray-900">
        <div class="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 mt-3">
          <slot name="header" />
        </div>
      </header>

      <main>
        <slot />
      </main>

      <Footer />
    </div>

    <!-- Music Flyout (persists across all pages) -->
    <MusicFlyout />
  </div>
</template>
