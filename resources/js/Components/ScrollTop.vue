<template>
  <div
    ref="scrollTopButton"
    class="hidden !fixed bottom-3 right-5 z-[60] w-fit transition"
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
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const { t } = useTranslations();
const props = defineProps({
  customScrollHandler: {
    type: Function,
    default: null
  }
});

const scrollTopButton = ref(null);

function scrollY() {
  if (typeof window === "undefined") {
    return 0;
  }
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

const handleScroll = () => {
  if (!scrollTopButton.value || typeof window === "undefined") return;

  if (scrollY() > 0) {
    scrollTopButton.value.classList.remove("hidden");
  } else {
    scrollTopButton.value.classList.add("hidden");
  }
};

const handleDebouncedScroll = debounce(handleScroll, 100);

const syncAfterPaint = () => {
  nextTick(() => {
    requestAnimationFrame(handleScroll);
  });
};

const onInertiaFinish = () => {
  syncAfterPaint();
};

onMounted(() => {
  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function"
  ) {
    window.addEventListener("scroll", handleDebouncedScroll, { passive: true });
    syncAfterPaint();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("inertia:finish", onInertiaFinish);
  }
});

onBeforeUnmount(() => {
  if (
    typeof window !== "undefined" &&
    typeof window.removeEventListener === "function"
  ) {
    window.removeEventListener("scroll", handleDebouncedScroll);
  }
  if (typeof document !== "undefined") {
    document.removeEventListener("inertia:finish", onInertiaFinish);
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
