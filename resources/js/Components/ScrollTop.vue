<template>
  <div
    ref="scrollTopButton"
    class="hidden !fixed bottom-3 right-5 transition z-10"
  >
    <div
      class="cursor-pointer bg-gray-50 rounded-full text-blue-600 transition hover:text-blue-300 dark:text-purple-900 dark:hover:text-purple-500"
    >
      <button
        role="button"
        :aria-label="t('general.scroll_to_top')"
        @click="scrollToTop"
      >
        <i class="ri-arrow-up-circle-line text-7xl"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useTranslations } from "@/composables/useTranslations";
import debounce from "lodash/debounce";
import { onBeforeUnmount, onMounted, ref } from "vue";

const { t } = useTranslations();
const props = defineProps({
  skipScrollToTop: {
    type: Boolean,
    default: false
  }
});

const scrollTopButton = ref(null);

const handleScroll = () => {
  if (!scrollTopButton.value || typeof window === "undefined") return;

  if (window.scrollY > 0) {
    scrollTopButton.value.classList.remove("hidden");
  } else {
    scrollTopButton.value.classList.add("hidden");
  }
};

const handleDebouncedScroll = debounce(handleScroll, 100);

onMounted(() => {
  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function"
  ) {
    window.addEventListener("scroll", handleDebouncedScroll);
  }
});

onBeforeUnmount(() => {
  if (
    typeof window !== "undefined" &&
    typeof window.removeEventListener === "function"
  ) {
    window.removeEventListener("scroll", handleDebouncedScroll);
  }
});

const scrollToTop = () => {
  if (typeof window === "undefined") return;

  if (!props.skipScrollToTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};
</script>
