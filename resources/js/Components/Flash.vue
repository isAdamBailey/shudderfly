<script setup>
import { usePage } from "@inertiajs/vue3";
import { onMounted, ref, watch } from "vue";

const page = usePage();
const show = ref(false);

const close = () => {
  show.value = false;
};

watch(
  () => page.props.flash?.success,
  (newValue) => {
    if (newValue) {
      show.value = true;
      setTimeout(close, 5000);
    }
  }
);

onMounted(() => {
  if (page.props.flash?.success) {
    show.value = true;
    setTimeout(close, 5000);
  }
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
