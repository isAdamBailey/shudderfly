<script setup>
import Button from "@/Components/Button.vue";
import { useSnapshotCooldown } from '@/composables/useSnapshotCooldown';
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { usePage } from '@inertiajs/vue3';
import { computed, onMounted } from 'vue';

const { isOnCooldown, remainingMinutes, checkCooldown } = useSnapshotCooldown();
const { speak, speaking } = useSpeechSynthesis();

const page = usePage();
const cooldownMinutes = computed(() => page.props.settings.snapshot_cooldown);

const message = `You can take a screenshot when you pause a video once every ${cooldownMinutes.value} minutes.`;
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
