import { ref } from "vue";

// Shared between the header's search triggers (top bar on phones, pill row on
// tablet and up) and the single panel they open.
const isOpen = ref(false);
const startWithVoice = ref(false);

export const voiceSearchSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

// Only the books and photos indexes run this search. Other pages (e.g. Music)
// send a `search` prop of their own, which must not leak into the header.
const SEARCH_PATHS = ["/books", "/photos"];

export function siteSearchQuery(page) {
    const path = (page.url || "").split("?")[0];
    return SEARCH_PATHS.includes(path) ? page.props?.search?.trim() || "" : "";
}

export function useHeaderSearch() {
    function open({ voice = false } = {}) {
        startWithVoice.value = voice;
        isOpen.value = true;
    }

    function close() {
        isOpen.value = false;
    }

    function toggle() {
        isOpen.value = !isOpen.value;
    }

    return { isOpen, startWithVoice, open, close, toggle };
}
