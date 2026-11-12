<script setup>
import { useVoiceClipPlayback } from "@/composables/useVoiceClipPlayback";
import { useTranslations } from "@/composables/useTranslations";
import { formatClock } from "@/utils/time";
import { computed, onUnmounted } from "vue";

const props = defineProps({
    src: { type: String, required: true },
    // Seconds; shown beside the button.
    duration: { type: Number, default: null },
});

const { t } = useTranslations();
const { playingSrc, playVoiceClip, stopVoiceClip } = useVoiceClipPlayback();

const playing = computed(() => playingSrc.value === props.src);
const label = computed(() =>
    playing.value ? t("voice.stop_playing") : t("voice.play")
);

const toggle = () =>
    playing.value ? stopVoiceClip() : playVoiceClip(props.src);

onUnmounted(() => {
    if (playing.value) stopVoiceClip();
});
</script>

<template>
    <button
        type="button"
        class="flex min-h-11 items-center gap-3 rounded-full bg-blue-600 px-4 py-2 text-white shadow-md transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-blue-500 dark:hover:bg-blue-600"
        :aria-label="label"
        :title="label"
        @click.stop="toggle"
    >
        <i
            :class="[
                playing ? 'ri-stop-circle-fill' : 'ri-play-circle-fill',
                'text-2xl leading-none',
            ]"
            aria-hidden="true"
        ></i>
        <i
            :class="[
                'ri-mic-fill text-lg leading-none',
                playing ? 'animate-pulse' : '',
            ]"
            aria-hidden="true"
        ></i>
        <span v-if="duration" class="text-sm font-semibold tabular-nums">
            {{ formatClock(Math.max(1, Math.round(duration))) }}
        </span>
    </button>
</template>
