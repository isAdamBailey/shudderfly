<template>
  <div
    ref="scrollTopButton"
    class="hidden transition"
    :class="
      embedded
        ? 'relative'
        : '!fixed bottom-3 right-5 z-40 w-fit'
    "
  >
    <button
      type="button"
      class="box-border flex h-14 w-14 min-h-[3.5rem] min-w-[3.5rem] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-gray-200/70 bg-gray-50 p-0 text-blue-600 shadow-lg ring-1 ring-gray-900/10 transition hover:bg-gray-100 hover:text-blue-500 dark:border-amber-400/35 dark:bg-zinc-600 dark:text-amber-200 dark:shadow-xl dark:shadow-black/50 dark:ring-2 dark:ring-amber-400/45 dark:hover:bg-zinc-500 dark:hover:text-amber-100"
      :aria-label="t('general.scroll_to_top')"
      @click="scrollToTop"
    >
      <i class="ri-arrow-up-line text-2xl" aria-hidden="true"></i>
    </button>
  </div>
</template>

<script setup>
import { useTranslations } from "@/composables/useTranslations";
import debounce from "lodash/debounce";
import { onBeforeUnmount, onMounted, ref } from "vue";

const { t } = useTranslations();
const props = defineProps({
  customScrollHandler: {
    type: Function,
    default: null
  },
  embedded: {
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

  if (props.customScrollHandler) {
    props.customScrollHandler();
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};
</script>
