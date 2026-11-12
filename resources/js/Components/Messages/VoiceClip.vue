<script setup>
import VoiceClipPlayer from "@/Components/Messages/VoiceClipPlayer.vue";
import { useTranslations } from "@/composables/useTranslations";

// A posted message's or comment's voice clip: its player once it's ready,
// otherwise why it isn't.
defineProps({
    status: { type: String, required: true },
    url: { type: String, default: null },
    duration: { type: Number, default: null },
});

const { t } = useTranslations();
</script>

<template>
    <div>
        <VoiceClipPlayer v-if="url" :src="url" :duration="duration" />
        <p
            v-else-if="status === 'failed'"
            class="inline-flex items-center gap-2 text-sm text-red-700 dark:text-red-300"
        >
            <i class="ri-error-warning-line" aria-hidden="true"></i>
            {{ t("voice.failed") }}
        </p>
        <p
            v-else
            class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
            role="status"
        >
            <i
                class="ri-loader-4-line animate-spin text-lg"
                aria-hidden="true"
            ></i>
            {{ t("voice.processing") }}
        </p>
    </div>
</template>
