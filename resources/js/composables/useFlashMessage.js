import { usePage } from "@inertiajs/vue3";
import { computed, ref } from "vue";

const echoFlashMessage = ref(null);
let echoFlashTimeout = null;

export function useFlashMessage() {
  const page = usePage();

  const flashMessage = computed(() => {
    // Check Echo flash message first (real-time)
    if (echoFlashMessage.value) {
      return echoFlashMessage.value;
    }

    // Fall back to Inertia flash messages
    const flash = page.props.flash;
    if (flash?.success) return { type: "success", text: flash.success };
    if (flash?.error) return { type: "error", text: flash.error };
    if (flash?.warning) return { type: "warning", text: flash.warning };
    if (flash?.info) return { type: "info", text: flash.info };
    return null;
  });

  const setFlashMessage = (type, text, duration = 5000) => {
    // Clear any existing timeout
    if (echoFlashTimeout) {
      clearTimeout(echoFlashTimeout);
      echoFlashTimeout = null;
    }

    // Create a new object to ensure reactivity works in Safari
    // Safari sometimes doesn't detect changes to the same object reference
    echoFlashMessage.value = { type, text };

    // Set timeout to clear the message
    echoFlashTimeout = setTimeout(() => {
      echoFlashMessage.value = null;
      echoFlashTimeout = null;
    }, duration);
  };

  const clearFlashMessage = () => {
    echoFlashMessage.value = null;
    if (echoFlashTimeout) {
      clearTimeout(echoFlashTimeout);
      echoFlashTimeout = null;
    }
  };

  return {
    flashMessage,
    setFlashMessage,
    clearFlashMessage
  };
}
