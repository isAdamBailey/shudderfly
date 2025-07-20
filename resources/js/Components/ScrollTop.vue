<template>
  <div
    ref="scrollTopButton"
    class="hidden fixed bottom-3 right-5 transition z-10"
  >
    <div
      class="cursor-pointer bg-gray-50 rounded-full text-blue-600 transition hover:text-blue-300 dark:text-purple-900 dark:hover:text-purple-500"
    >
      <button
        role="button"
        aria-label="scroll to top of the page"
        @click="scrollToTop"
      >
        <i class="ri-arrow-up-circle-line text-7xl"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { router } from "@inertiajs/vue3";
import debounce from "lodash/debounce";
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  method: {
    type: [Function, String],
    default: null
  }
});

const scrollTopButton = ref(null);

const handleScroll = () => {
  if (!scrollTopButton.value) return;

  if (window.scrollY > 0) {
    scrollTopButton.value.classList.remove("hidden");
  } else {
    scrollTopButton.value.classList.add("hidden");
  }
};

const handleDebouncedScroll = debounce(handleScroll, 100);

onMounted(() => {
  window.addEventListener("scroll", handleDebouncedScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleDebouncedScroll);
});

const scrollToTop = async () => {
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (props.method) {
    await new Promise((resolve) => {
      const checkIfScrollIsAtTop = setInterval(() => {
        if (window.scrollY === 0) {
          clearInterval(checkIfScrollIsAtTop);
          resolve();
        }
      }, 10);
    });

    if (typeof props.method === "function") {
      props.method();
    } else if (typeof props.method === "string") {
      router.visit(props.method);
    }
  }
};
</script>
