<script setup>
import FlashMessage from "@/Components/Flash.vue";
import SearchInput from "@/Components/SearchInput.vue";
import Footer from "@/Layouts/Nav/Footer.vue";
import Navigation from "@/Layouts/Nav/Navigation.vue";
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <div class="flex flex-col flex-grow bg-gray-900">
      <Navigation />

      <FlashMessage />

      <div class="w-full pl-2 sm:pl-6 lg:pl-8 mt-3 pr-8">
        <SearchInput />
      </div>

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
  </div>
</template>
