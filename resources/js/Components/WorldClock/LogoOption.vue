<script setup>
import ThemeLogoIcon from "@/Components/ThemeLogoIcon.vue";
import SelectableClockTile from "@/Components/WorldClock/SelectableClockTile.vue";
import { useLogoPreference } from "@/composables/useLogoPreference";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { computed } from "vue";

defineProps({
    size: { type: Number, default: 220 },
});

const { logo, clearLogoClock } = useLogoPreference();
const { speak } = useSpeechSynthesis();
const { t } = useTranslations();

const isActive = computed(() => !logo.enabled);

const select = () => {
    if (isActive.value) return;
    clearLogoClock();
    speak(t("world_clock.default_logo_restored"));
};
</script>

<template>
    <SelectableClockTile
        :active="isActive"
        :size="size"
        label="Logo"
        :aria-label="
            isActive
                ? 'App logo is the current logo'
                : 'Use the app logo instead of a clock'
        "
        title="Use the app logo instead of a clock"
        @select="select"
    >
        <ThemeLogoIcon />
    </SelectableClockTile>
</template>
