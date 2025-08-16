<script setup>
import { router, usePage } from "@inertiajs/vue3";
import { onBeforeUnmount, onMounted, ref } from "vue";

const page = usePage();
const show = ref(false);
let hideTimeoutId = null;
let disposeSuccess = null; // disposer returned by router.on in newer Inertia versions

const close = () => {
  show.value = false;
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
};

const triggerIfMessage = () => {
  const message = page.props.flash?.success;
  if (message) {
    show.value = true;
    if (hideTimeoutId) clearTimeout(hideTimeoutId);
    hideTimeoutId = setTimeout(close, 5000);
  }
};

// Ensure first render (direct loads) shows the message
onMounted(() => {
  triggerIfMessage();

  // Show after every successful Inertia navigation, regardless of identical text
  // router.on returns a disposer in newer versions; keep a reference for cleanup
  const maybeDisposer = router.on("success", triggerIfMessage);
  if (typeof maybeDisposer === "function") {
    disposeSuccess = maybeDisposer;
  }
});

onBeforeUnmount(() => {
  // Prefer the disposer if available; otherwise fall back to router.off when supported
  if (typeof disposeSuccess === "function") {
    disposeSuccess();
  } else if (typeof router.off === "function") {
    router.off("success", triggerIfMessage);
  }
  if (hideTimeoutId) clearTimeout(hideTimeoutId);
});
</script>

<template>
  <div v-if="show" class="fixed top-0 left-0 right-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-3">
      <div
        class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative shadow-lg flex items-center justify-between"
        role="alert"
      >
        <span class="flex-1 pr-8">{{ page.props.flash.success }}</span>
        <button
          class="flex-shrink-0 ml-4 p-1 rounded-full hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
          aria-label="Close notification"
          type="button"
          @click="close"
        >
          <i class="ri-close-line text-2xl text-green-600"></i>
        </button>
      </div>
    </div>
  </div>
</template>
