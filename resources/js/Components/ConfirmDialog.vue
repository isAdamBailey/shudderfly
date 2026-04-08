<script setup>
import Button from "@/Components/Button.vue";
import DangerButton from "@/Components/DangerButton.vue";
import Modal from "@/Components/Modal.vue";
import SecondaryButton from "@/Components/SecondaryButton.vue";
import { computed, getCurrentInstance, useSlots } from "vue";

const instance = getCurrentInstance();
const dialogUid = instance?.uid ?? 0;
const titleId = `confirm-dialog-title-${dialogUid}`;
const descId = `confirm-dialog-desc-${dialogUid}`;

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: "",
    },
    message: {
        type: String,
        default: "",
    },
    maxWidth: {
        type: String,
        default: "md",
    },
    confirmLabel: {
        type: String,
        default: "",
    },
    cancelLabel: {
        type: String,
        default: "",
    },
    confirmVariant: {
        type: String,
        default: "primary",
        validator: (v) => ["primary", "danger"].includes(v),
    },
    closeable: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["update:show", "confirm", "cancel"]);

const slots = useSlots();

const hasTitleSlot = computed(() => !!slots.title);
const hasDefaultSlot = computed(() => !!slots.default);
const hasFooterSlot = computed(() => !!slots.footer);

const showTitleRegion = computed(() => props.title || hasTitleSlot.value);
const showBodyRegion = computed(
    () => props.message || hasDefaultSlot.value
);

function onDismiss() {
    emit("update:show", false);
    emit("cancel");
}

function onConfirm() {
    emit("confirm");
    emit("update:show", false);
}
</script>

<template>
    <Modal
        :show="show"
        :max-width="maxWidth"
        :closeable="closeable"
        @close="onDismiss"
    >
        <div
            class="p-6"
            role="alertdialog"
            aria-modal="true"
            :aria-labelledby="showTitleRegion ? titleId : undefined"
            :aria-describedby="showBodyRegion ? descId : undefined"
        >
            <div v-if="showTitleRegion" class="mb-2">
                <h2
                    :id="titleId"
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                >
                    <slot name="title">{{ title }}</slot>
                </h2>
            </div>
            <div
                v-if="showBodyRegion"
                :id="descId"
                class="text-sm text-gray-600 dark:text-gray-400"
            >
                <slot>
                    <p v-if="message" class="whitespace-pre-wrap">{{ message }}</p>
                </slot>
            </div>
            <div v-if="hasFooterSlot" class="mt-6">
                <slot name="footer" :confirm="onConfirm" :cancel="onDismiss" />
            </div>
            <div v-else class="mt-6 flex justify-end gap-3">
                <SecondaryButton type="button" @click="onDismiss">
                    <slot name="cancelButton">{{ cancelLabel }}</slot>
                </SecondaryButton>
                <DangerButton
                    v-if="confirmVariant === 'danger'"
                    type="button"
                    @click="onConfirm"
                >
                    <slot name="confirmButton">{{ confirmLabel }}</slot>
                </DangerButton>
                <Button
                    v-else
                    type="button"
                    @click="onConfirm"
                >
                    <slot name="confirmButton">{{ confirmLabel }}</slot>
                </Button>
            </div>
        </div>
    </Modal>
</template>
