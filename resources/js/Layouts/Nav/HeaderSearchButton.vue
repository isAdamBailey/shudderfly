<script setup>
import {
    siteSearchQuery,
    useHeaderSearch,
    voiceSearchSupported,
} from "@/composables/useHeaderSearch";
import { useTranslations } from "@/composables/useTranslations";
import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

const props = defineProps({
    // "pill" sits at the end of the tablet/desktop pill row with a label from
    // lg up; "icon" is the compact phone top-bar version.
    variant: { type: String, default: "pill" },
});

const { t } = useTranslations();
const { isOpen, open, toggle } = useHeaderSearch();
const page = usePage();

const isPill = computed(() => props.variant === "pill");
const activeQuery = computed(() => siteSearchQuery(page));
const label = computed(() =>
    activeQuery.value
        ? t("search.active", { query: activeQuery.value })
        : t("search.open")
);

const buttonClass = computed(() => {
    if (!isPill.value) {
        return "relative min-h-14 min-w-14 rounded-lg text-white transition-opacity hover:opacity-80";
    }
    return [
        "btn-bulge min-h-11 min-w-11 max-w-[14rem] gap-2 rounded-full border px-2.5 py-1.5 text-sm font-body font-semibold transition-colors duration-150 ease-in-out lg:px-3 lg:text-base",
        isOpen.value || activeQuery.value
            ? "bg-theme-selected border-transparent"
            : "border-white/20 text-gray-100 hover:bg-white/10 hover:text-theme-primary",
    ];
});
</script>

<template>
    <div class="flex shrink-0 items-center gap-1">
        <button
            type="button"
            class="inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            :class="buttonClass"
            :aria-expanded="isOpen.toString()"
            aria-controls="header-search-panel"
            :aria-label="isOpen ? t('search.close_aria') : label"
            aria-keyshortcuts="/"
            @click="toggle"
        >
            <i
                :class="[
                    isOpen ? 'ri-close-line' : 'ri-search-line',
                    isPill ? 'text-lg' : 'text-2xl',
                ]"
                aria-hidden="true"
            ></i>
            <template v-if="isPill">
                <span class="hidden truncate lg:inline">{{ label }}</span>
                <kbd
                    v-if="!isOpen && !activeQuery"
                    class="hidden lg:inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/30 px-1 font-body text-xs opacity-60"
                    aria-hidden="true"
                    >/</kbd
                >
            </template>
            <span
                v-else-if="activeQuery && !isOpen"
                class="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-gray-900"
                aria-hidden="true"
            ></span>
        </button>
        <button
            v-if="isPill && voiceSearchSupported && !isOpen"
            type="button"
            class="btn-bulge inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-100 transition-colors duration-150 hover:bg-white/10 hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            :aria-label="t('search.voice_aria')"
            :title="t('search.voice_aria')"
            @click="open({ voice: true })"
        >
            <i class="ri-mic-line text-lg" aria-hidden="true"></i>
        </button>
    </div>
</template>
