<script setup>
import SearchInput from "@/Components/SearchInput.vue";
import { useFocusTrap } from "@/composables/useFocusTrap";
import { useHeaderSearch } from "@/composables/useHeaderSearch";
import { useTranslations } from "@/composables/useTranslations";
import { router } from "@inertiajs/vue3";
import { useEventListener } from "@vueuse/core";
import { nextTick, onUnmounted, ref, watch } from "vue";

const { t } = useTranslations();
const { isOpen, startWithVoice, open, close } = useHeaderSearch();
const panelRef = ref(null);
const searchRef = ref(null);
const { activate, deactivate, trapKeydown } = useFocusTrap(panelRef);

watch(isOpen, async (value) => {
    if (!value) {
        deactivate();
        return;
    }
    activate();
    await nextTick();
    if (startWithVoice.value) {
        startWithVoice.value = false;
        searchRef.value?.toggleVoiceRecognition();
    } else {
        searchRef.value?.focus();
    }
});

const isTypingTarget = (el) =>
    ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName) ||
    Boolean(el?.isContentEditable);

useEventListener(window, "keydown", (event) => {
    if (event.key === "Escape" && isOpen.value) {
        close();
    } else if (
        event.key === "/" &&
        !isOpen.value &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
    ) {
        event.preventDefault();
        open();
    }
});

// Leaving the page closes the panel; focus goes wherever the new page puts it.
onUnmounted(
    router.on("navigate", () => {
        isOpen.value = false;
    })
);
</script>

<template>
    <Transition
        enter-active-class="transition-opacity duration-200 ease-out motion-reduce:transition-none"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150 ease-in motion-reduce:transition-none"
        leave-to-class="opacity-0"
    >
        <div
            v-if="isOpen"
            class="fixed inset-x-0 bottom-0 top-[var(--app-header-h)] z-30 bg-black/40"
            aria-hidden="true"
            @click="close()"
        ></div>
    </Transition>
    <Transition
        enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
        enter-from-class="-translate-y-2 opacity-0"
        leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
        leave-to-class="-translate-y-2 opacity-0"
    >
        <div
            v-if="isOpen"
            id="header-search-panel"
            ref="panelRef"
            role="search"
            tabindex="-1"
            @keydown="trapKeydown"
            class="fixed inset-x-0 top-[var(--app-header-h)] z-40 focus:outline-none border-b border-white/10 bg-gray-900 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.6)]"
        >
            <div
                class="mx-auto flex max-w-4xl items-start gap-2 px-3 py-3 sm:px-6"
            >
                <div class="min-w-0 flex-1">
                    <SearchInput ref="searchRef" />
                </div>
                <button
                    type="button"
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    :aria-label="t('search.close_aria')"
                    @click="close()"
                >
                    <i class="ri-close-line text-xl" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    </Transition>
</template>
