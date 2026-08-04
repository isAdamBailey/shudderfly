<template>
    <Modal :show="show" max-width="2xl" @close="$emit('close')">
        <div class="flex flex-col message-builder-sheet">
            <!-- Message Builder: input, category toolbar and the shared content
                 pane. Fills the available height and scrolls internally so the
                 toolbar stays reachable above the on-screen keyboard. -->
            <div class="flex-1 min-h-0 flex">
                <MessageBuilder
                    v-if="show"
                    ref="messageBuilderRef"
                    :mode="mode"
                    :message-id="messageId"
                    :users="users"
                    @message-posted="$emit('message-posted')"
                    @comment-posted="$emit('comment-posted', $event)"
                />
            </div>

            <!-- Sticky Footer: submit button always visible -->
            <div
                class="flex-shrink-0 p-4 pt-3 sm:p-6 sm:pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
                <Button
                    class="py-4 text-lg w-full"
                    :disabled="submitDisabled"
                    @click="submit"
                >
                    <i class="ri-send-plane-fill text-2xl mr-2"></i>
                    {{ submitLabel }}
                </Button>
            </div>
        </div>
    </Modal>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import MessageBuilder from "@/Components/Messages/MessageBuilder.vue";
import Modal from "@/Components/Modal.vue";
import { useMessageBuilder } from "@/composables/useMessageBuilder";
import { computed, ref, watch } from "vue";

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    users: {
        type: Array,
        default: () => [],
    },
    mode: {
        type: String,
        default: "message",
        validator: (value) => ["message", "comment"].includes(value),
    },
    messageId: {
        type: Number,
        default: null,
    },
});

defineEmits(["close", "message-posted", "comment-posted"]);

const isCommentMode = computed(() => props.mode === "comment");

const messageBuilderRef = ref(null);

const submitDisabled = computed(
    () => messageBuilderRef.value?.submitDisabled ?? true
);
const submitLabel = computed(() => messageBuilderRef.value?.submitLabel ?? "");

function submit() {
    messageBuilderRef.value?.submitContent();
}

const { setActiveCommentInput, setActiveMessageInput } = useMessageBuilder();

watch(
    () => [props.show, props.mode, props.messageId],
    ([show]) => {
        if (!show) {
            return;
        }
        if (isCommentMode.value && props.messageId) {
            setActiveCommentInput(props.messageId);
            return;
        }
        setActiveMessageInput();
    },
    { immediate: true }
);
</script>

<style scoped>
/* Desktop: card shrinks to fit its content, capped at 85% of the viewport. */
.message-builder-sheet {
    max-height: 85vh;
    max-height: 85dvh;
}

/* Mobile: same shrink-to-fit behaviour, but the cap subtracts the modal
   wrapper's vertical padding (py-8 => 2rem top + bottom) so the sheet — and
   with it the sticky send button — always lands inside the visible viewport
   instead of overflowing below the fold. With no category pane open the sheet
   collapses to the input + toolbar + footer; opening a pane grows it to the
   cap and the pane scrolls internally. */
@media (max-width: 639px) {
    .message-builder-sheet {
        max-height: calc(100vh - 4rem);
        max-height: calc(100dvh - 4rem);
    }
}
</style>
