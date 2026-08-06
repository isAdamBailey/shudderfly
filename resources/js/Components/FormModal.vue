<script setup>
import Button from "@/Components/Button.vue";
import Modal from "@/Components/Modal.vue";
import { useTranslations } from "@/composables/useTranslations";
import { getCurrentInstance, useSlots } from "vue";

const { t } = useTranslations();

const instance = getCurrentInstance();
const titleId = `form-modal-title-${instance?.uid ?? 0}`;

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: "",
    },
    maxWidth: {
        type: String,
        default: "2xl",
    },
    closeable: {
        type: Boolean,
        default: true,
    },
    // A template ref to a form component that exposes { submit,
    // submitDisabled, submitLabel } (see NewPageForm/EditBookForm/
    // EditPageForm/NewBookForm). When set, FormModal renders a standard
    // sticky footer submit button wired to it. Pass a #footer slot instead
    // for forms with different submit semantics.
    submitRef: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(["close"]);

const slots = useSlots();
const hasFooterSlot = () => !!slots.footer || !!props.submitRef;

function close() {
    emit("close");
}
</script>

<template>
    <Modal
        :show="show"
        :max-width="maxWidth"
        :closeable="closeable"
        :labelledby="titleId"
        @close="close"
    >
        <div class="flex flex-col modal-sheet">
            <div
                class="flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6"
            >
                <h2
                    :id="titleId"
                    class="text-xl sm:text-2xl font-medium text-gray-900 dark:text-gray-100 truncate"
                >
                    {{ title }}
                </h2>
                <button
                    v-if="closeable"
                    type="button"
                    class="flex items-center justify-center h-11 w-11 shrink-0 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    :aria-label="t('common.close')"
                    @click="close"
                >
                    <i class="ri-close-line text-2xl" aria-hidden="true"></i>
                </button>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                <slot />
            </div>

            <div
                v-if="hasFooterSlot()"
                class="flex-shrink-0 p-4 pt-3 sm:p-6 sm:pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
                <slot name="footer">
                    <Button
                        type="button"
                        class="w-full flex justify-center py-3"
                        :disabled="submitRef?.submitDisabled"
                        @click="submitRef?.submit()"
                    >
                        <span class="text-xl">{{
                            submitRef?.submitLabel
                        }}</span>
                    </Button>
                </slot>
            </div>
        </div>
    </Modal>
</template>
