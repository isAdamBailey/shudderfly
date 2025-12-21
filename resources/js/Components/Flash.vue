<script setup>
import { useFlashMessage } from "@/composables/useFlashMessage";
import { useTranslations } from "@/composables/useTranslations";
import { router } from "@inertiajs/vue3";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";

const { flashMessage, clearFlashMessage } = useFlashMessage();
const { t } = useTranslations();
const show = ref(false);
const forceRender = ref(0); // Force re-render counter for Safari

// Create a computed to explicitly track the flash message for Safari compatibility
const hasFlashMessage = computed(() => {
  return !!flashMessage.value;
});
let hideTimeoutId = null;
let disposeSuccess = null;

const close = () => {
  show.value = false;
  clearFlashMessage();
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
};

const messageStyles = computed(() => {
  const type = flashMessage.value?.type;

  switch (type) {
    case "success":
      return {
        container: "bg-green-50 border-green-200 text-green-900",
        button: "hover:bg-green-100 focus:ring-green-500",
        icon: "text-green-700",
        iconName: "ri-check-line"
      };
    case "error":
      return {
        container: "bg-red-50 border-red-200 text-red-900",
        button: "hover:bg-red-100 focus:ring-red-500",
        icon: "text-red-700",
        iconName: "ri-error-warning-line"
      };
    case "warning":
      return {
        container: "bg-orange-50 border-orange-200 text-orange-900",
        button: "hover:bg-orange-100 focus:ring-orange-500",
        icon: "text-orange-700",
        iconName: "ri-alert-line"
      };
    case "info":
      return {
        container: "bg-blue-50 border-blue-200 text-blue-900",
        button: "hover:bg-blue-100 focus:ring-blue-500",
        icon: "text-blue-700",
        iconName: "ri-information-line"
      };
    default:
      return {
        container: "bg-gray-50 border-gray-200 text-gray-900",
        button: "hover:bg-gray-100 focus:ring-gray-500",
        icon: "text-gray-700",
        iconName: "ri-information-line"
      };
  }
});

const triggerIfMessage = async () => {
  if (flashMessage.value) {
    // Force a re-render by incrementing the counter (moved from computed to avoid side effect)
    forceRender.value++;
    show.value = true;
    // Force a re-render by waiting for next tick
    await nextTick();
    if (hideTimeoutId) clearTimeout(hideTimeoutId);
    // Auto-hide success and info messages, but keep errors/warnings visible longer
    const hideDelay = ["error", "warning"].includes(flashMessage.value.type)
      ? 5000
      : 3000;
    hideTimeoutId = setTimeout(close, hideDelay);
  } else {
    // If flash message is null, hide the component
    show.value = false;
  }
};

// Watch for flash message changes (including Echo-triggered ones)
let lastFlashMessageId = null;
watch(
  flashMessage,
  (newVal) => {
    // Create a unique ID for this flash message to prevent duplicate triggers
    const messageId = newVal ? `${newVal.type}-${newVal.text}` : null;
    if (messageId === lastFlashMessageId && show.value) {
      // Already showing this message, skip
      return;
    }
    lastFlashMessageId = messageId;
    triggerIfMessage();
  },
  { immediate: true, deep: true }
);

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
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 translate-y-[10px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[10px]"
    >
      <div
        v-if="show && hasFlashMessage && flashMessage"
        :key="forceRender"
        class="fixed bottom-4 left-4 z-50 max-w-md w-full"
        style="position: fixed; bottom: 1rem; left: 1rem; z-index: 9999"
      >
        <div
          :class="[
            'border px-4 py-3 rounded-2xl relative flex items-center gap-3 backdrop-blur-sm',
            messageStyles.container
          ]"
          role="alert"
        >
          <div class="flex items-center flex-1 min-w-0">
            <i
              :class="[
                messageStyles.iconName,
                'text-xl flex-shrink-0',
                messageStyles.icon
              ]"
            ></i>
            <span class="ml-3 text-lg font-semibold break-words">{{
              flashMessage.text
            }}</span>
          </div>
          <button
            :class="[
              'flex-shrink-0 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
              messageStyles.button
            ]"
            :aria-label="t('general.close')"
            type="button"
            @click="close"
          >
            <i :class="['ri-close-line text-xl', messageStyles.icon]"></i>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
