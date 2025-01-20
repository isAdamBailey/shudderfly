<script setup>
import Button from "@/Components/Button.vue";
import { COOLDOWN_MINUTES, useSnapshotCooldown } from '@/composables/useSnapshotCooldown';
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { computed, onMounted } from 'vue';

const { isOnCooldown, remainingMinutes, checkCooldown } = useSnapshotCooldown();
const { speak, speaking } = useSpeechSynthesis();

const message = `You can take a screenshot when you pause a video once every ${COOLDOWN_MINUTES} minutes.`;
const remainingMessage = computed(() => `You have to wait ${remainingMinutes.value} more minutes.`);

onMounted(() => {
    checkCooldown();
});
</script>

<template>
    <div class="flex justify-between">
        <div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ message }}
            </p>
            <p v-if="isOnCooldown" class="ml-1 text-blue-600">
                {{ remainingMessage }}
            </p>
        </div>
        <Button
            type="button"
            :disabled="speaking"
            @click="speak(`${message} ${isOnCooldown ? remainingMessage : ''}`)"
        >
            <i class="ri-speak-fill text-xl"></i>
        </Button>
    </div>
</template>
