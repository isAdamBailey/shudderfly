<template>
    <form @submit.prevent="submit">
        <button
            type="submit"
            class="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors ease-in-out duration-150"
            aria-label="Delete page"
            title="Delete page"
        >
            <i class="ri-delete-bin-line text-lg" aria-hidden="true"></i>
        </button>
    </form>
    <ConfirmDialog
        v-model:show="confirmShow"
        :title="confirmTitle"
        :message="confirmMessage"
        :confirm-label="confirmOkLabel || t('common.ok')"
        :cancel-label="confirmCancelLabel || t('common.cancel')"
        :confirm-variant="confirmVariant"
        @confirm="confirmOnOk"
        @cancel="confirmOnCancel"
    />
</template>

<script setup>
/* global route */
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useTranslations } from "@/composables/useTranslations";
import { useForm } from "@inertiajs/vue3";

const { t } = useTranslations();
const {
    show: confirmShow,
    message: confirmMessage,
    title: confirmTitle,
    confirmLabel: confirmOkLabel,
    cancelLabel: confirmCancelLabel,
    confirmVariant,
    ask: askConfirm,
    onConfirmed: confirmOnOk,
    onCancelled: confirmOnCancel,
} = useConfirmDialog();

const emit = defineEmits(["close-page-form"]);

const props = defineProps({
    page: { type: Object, required: true },
});

const form = useForm({});

const submit = async () => {
    const ok = await askConfirm(
        "Are you sure you want to delete this page? The media will also be deleted."
    );
    if (!ok) {
        return;
    }
    form.delete(route("pages.destroy", props.page), {
        onSuccess: () => {
            form.reset();
            emit("close-page-form");
        },
    });
};
</script>
