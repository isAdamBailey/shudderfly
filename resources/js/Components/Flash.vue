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
const forceRender = ref(0);
const hideTimeoutId = ref(null);
const disposeSuccess = ref(null);
const routerSuccessHandler = ref(null);

const close = () => {
  show.value = false;
  clearFlashMessage();
  if (hideTimeoutId.value) {
    clearTimeout(hideTimeoutId.value);
    hideTimeoutId.value = null;
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
    forceRender.value++;
    show.value = true;
    await nextTick();
    await nextTick();
    if (hideTimeoutId.value) clearTimeout(hideTimeoutId.value);
    const hideDelay = ["error", "warning"].includes(flashMessage.value.type)
      ? 5000
      : 3000;
    hideTimeoutId.value = setTimeout(close, hideDelay);
  } else {
    show.value = false;
  }
};

let lastFlashMessageId = null;
watch(
  flashMessage,
  (newVal) => {
    const messageId = newVal ? `${newVal.type}-${newVal.text}` : null;
    if (messageId === lastFlashMessageId && show.value && newVal) {
      return;
    }
    lastFlashMessageId = messageId;
    requestAnimationFrame(() => {
      triggerIfMessage();
    });
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  requestAnimationFrame(() => {
    triggerIfMessage();
  });

  const handler = () => {
    requestAnimationFrame(() => {
      triggerIfMessage();
    });
  };
  routerSuccessHandler.value = handler;
  const maybeDisposer = router.on("success", handler);
  if (typeof maybeDisposer === "function") {
    disposeSuccess.value = maybeDisposer;
  }
});

onBeforeUnmount(() => {
  if (typeof disposeSuccess.value === "function") {
    disposeSuccess.value();
    disposeSuccess.value = null;
  } else if (typeof router.off === "function" && routerSuccessHandler.value) {
    router.off("success", routerSuccessHandler.value);
    routerSuccessHandler.value = null;
  }
  if (hideTimeoutId.value) {
    clearTimeout(hideTimeoutId.value);
    hideTimeoutId.value = null;
  }
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
        v-if="show && flashMessage"
        :key="`flash-${forceRender}-${flashMessage?.type}-${flashMessage?.text}`"
        class="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-[9999]"
      >
        <div
          :class="[
            'border px-3 sm:px-4 py-3 rounded-2xl relative flex items-center gap-2 sm:gap-3',
            messageStyles.container
          ]"
          role="alert"
          :style="{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }"
        >
          <div class="flex items-center flex-1 min-w-0">
            <i
              :class="[
                messageStyles.iconName,
                'text-lg sm:text-xl flex-shrink-0',
                messageStyles.icon
              ]"
            ></i>
            <span
              class="ml-2 sm:ml-3 text-base sm:text-lg font-semibold break-words overflow-wrap-anywhere"
              >{{ flashMessage.text }}</span
            >
          </div>
          <button
            :class="[
              'flex-shrink-0 p-1.5 sm:p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
              messageStyles.button
            ]"
            :aria-label="t('general.close')"
            type="button"
            @click="close"
          >
            <i
              :class="['ri-close-line text-lg sm:text-xl', messageStyles.icon]"
            ></i>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
