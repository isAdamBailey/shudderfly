<script setup>
import { router } from "@inertiajs/vue3";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const { flashMessage, clearFlashMessage } = useFlashMessage();
const show = ref(false);
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
                container: "bg-green-100 border-green-400 text-green-700",
                button: "hover:bg-green-200 focus:ring-green-500",
                icon: "text-green-600",
                iconName: "ri-check-line",
            };
        case "error":
            return {
                container: "bg-red-100 border-red-400 text-red-700",
                button: "hover:bg-red-200 focus:ring-red-500",
                icon: "text-red-600",
                iconName: "ri-error-warning-line",
            };
        case "warning":
            return {
                container: "bg-orange-100 border-orange-400 text-orange-700",
                button: "hover:bg-orange-200 focus:ring-orange-500",
                icon: "text-orange-600",
                iconName: "ri-alert-line",
            };
        case "info":
            return {
                container: "bg-blue-100 border-blue-400 text-blue-700",
                button: "hover:bg-blue-200 focus:ring-blue-500",
                icon: "text-blue-600",
                iconName: "ri-information-line",
            };
        default:
            return {
                container: "bg-gray-100 border-gray-400 text-gray-700",
                button: "hover:bg-gray-200 focus:ring-gray-500",
                icon: "text-gray-600",
                iconName: "ri-information-line",
            };
    }
});

const triggerIfMessage = () => {
    if (flashMessage.value) {
        show.value = true;
        if (hideTimeoutId) clearTimeout(hideTimeoutId);
        // Auto-hide success and info messages, but keep errors/warnings visible longer
        const hideDelay = ["error", "warning"].includes(flashMessage.value.type)
            ? 8000
            : 5000;
        hideTimeoutId = setTimeout(close, hideDelay);
    }
};

// Watch for flash message changes (including Echo-triggered ones)
watch(flashMessage, (newValue, oldValue) => {
    // Only trigger if the message actually changed
    if (newValue !== oldValue) {
        triggerIfMessage();
    }
}, { immediate: true, deep: true });

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
    <div v-if="show && flashMessage" class="fixed top-0 left-0 right-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-3">
            <div
                :class="[
                    'border px-4 py-3 rounded relative shadow-lg flex items-center justify-between',
                    messageStyles.container,
                ]"
                role="alert"
            >
                <div class="flex items-center flex-1 pr-8">
                    <i
                        :class="[
                            messageStyles.iconName,
                            'text-xl mr-3',
                            messageStyles.icon,
                        ]"
                    ></i>
                    <span>{{ flashMessage.text }}</span>
                </div>
                <button
                    :class="[
                        'flex-shrink-0 ml-4 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
                        messageStyles.button,
                    ]"
                    aria-label="Close notification"
                    type="button"
                    @click="close"
                >
                    <i
                        :class="['ri-close-line text-2xl', messageStyles.icon]"
                    ></i>
                </button>
            </div>
        </div>
    </div>
</template>
