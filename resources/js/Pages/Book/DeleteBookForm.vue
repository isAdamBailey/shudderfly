<template>
    <form class="text-center mt-10" @submit.prevent="submit">
        <DangerButton>Delete Book</DangerButton>
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
import DangerButton from "@/Components/DangerButton.vue";
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

const props = defineProps({
    book: Object,
});

const form = useForm({});

const submit = async () => {
    const ok = await askConfirm(
        "Are you sure you want to delete this book and all its pages?"
    );
    if (!ok) {
        return;
    }
    form.delete(route("books.destroy", props.book.slug));
};
</script>
