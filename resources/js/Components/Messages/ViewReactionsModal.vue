<template>
    <Modal :show="show" max-width="sm" @close="$emit('close')">
        <div class="p-6">
            <div class="flex items-center justify-between mb-4">
                <h2
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                >
                    {{ t("general.reactions") }}
                </h2>
                <Button
                    type="button"
                    :disabled="speaking"
                    :title="t('general.speak_all_reactions')"
                    :aria-label="t('general.speak_all_reactions_aria')"
                    @click="$emit('speak-all')"
                >
                    <i class="ri-speak-fill text-xl"></i>
                </Button>
            </div>
            <div v-if="hasReactions" class="space-y-4">
                <div
                    v-for="emoji in selectedReactions"
                    :key="emoji"
                    class="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
                >
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-2xl">{{ emoji }}</span>
                        <span
                            class="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            {{ getReactionCount(emoji) }}
                            {{
                                getReactionCount(emoji) === 1
                                    ? t("message.reaction")
                                    : t("message.reactions")
                            }}
                        </span>
                    </div>
                    <div class="space-y-1 ml-8">
                        <div
                            v-for="user in getReactionUsers(emoji)"
                            :key="user.id"
                            class="text-sm text-gray-600 dark:text-gray-400"
                        >
                            {{ user.name }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import Modal from "@/Components/Modal.vue";
import { useGroupedReactions } from "@/composables/useGroupedReactions";
import { useTranslations } from "@/composables/useTranslations";
import { computed, toRef } from "vue";

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    groupedReactions: {
        type: Object,
        default: () => ({}),
    },
    speaking: {
        type: Boolean,
        default: false,
    },
});

defineEmits(["close", "speak-all"]);

const { t } = useTranslations();

const groupedReactionsRef = toRef(props, "groupedReactions");
const {
    getReactionCount,
    getReactionUsers,
    getSelectedReactions,
} = useGroupedReactions(groupedReactionsRef);

const selectedReactions = computed(() => getSelectedReactions());
const hasReactions = computed(() => selectedReactions.value.length > 0);
</script>
